// Wires SocketManager (or its mock) to the RepositoryBundle. On mount
// the provider connects, subscribes to incoming events, and listens to
// AppState so the socket disconnects when the app goes to the
// background and reconnects when it returns to the foreground. State
// transitions are exposed via `useSocketState()` so screens can render
// a simple connection indicator.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SocketConnectionState } from '../../domain/enums';
import { SocketManager } from '../../realtime/SocketManager';
import { MockSocketManager } from '../../realtime/MockSocketManager';
import { SocketEvent } from '../../realtime/events';
import { useRepositoryBundle } from './RepositoryProvider';

type SocketContextValue = {
  state: SocketConnectionState;
  manager: SocketManager | MockSocketManager;
};

const SocketContext = createContext<SocketContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  manager?: SocketManager | MockSocketManager;
  url?: string;
  /** When false the provider does not call connect() on mount and skips AppState handling. */
  autoConnect?: boolean;
  /** Test override -- skips the AppState listener registration. */
  skipAppStateLifecycle?: boolean;
};

const DEFAULT_URL = 'ws://localhost:4000';

export function SocketProvider({
  children,
  manager,
  url = DEFAULT_URL,
  autoConnect = true,
  skipAppStateLifecycle,
}: ProviderProps) {
  const repos = useRepositoryBundle();
  const stableManager = useMemo(
    () => manager ?? new SocketManager(),
    [manager],
  );

  const [state, setState] = useState<SocketConnectionState>(
    stableManager.state,
  );

  useEffect(() => {
    const unsubState = stableManager.onStateChange(setState);
    const unsubMessage = stableManager.onMessage((event: SocketEvent) => {
      switch (event.type) {
        case 'request.created':
        case 'request.updated':
          void repos.requests.upsertFromRemote(event.payload);
          break;
        case 'request.status_changed': {
          // Apply a partial update by reading the local copy and patching it.
          const { id, status } = event.payload;
          void (async () => {
            const existing = await repos.local.requests.getById(id);
            if (existing) {
              await repos.requests.upsertFromRemote({
                ...existing,
                status,
                updatedAt: new Date().toISOString(),
              });
            }
          })();
          break;
        }
        case 'response.created':
        case 'response.accepted':
          void repos.responses.upsertFromRemote(event.payload);
          break;
        case 'notification.created':
          void repos.notifications.appendFromSocket(event.payload);
          break;
      }
    });
    if (autoConnect) {
      stableManager.connect(url);
    }
    return () => {
      unsubState();
      unsubMessage();
      if (autoConnect) stableManager.disconnect();
    };
  }, [stableManager, autoConnect, url, repos]);

  // AppState lifecycle: disconnect on background/inactive, reconnect on
  // active. Tracks an "intent to connect" so the second app launch
  // resumes the previous behavior. Avoids duplicate connects: the
  // SocketManager itself ignores `connect()` while it is already
  // Connecting/Connected.
  useEffect(() => {
    if (!autoConnect || skipAppStateLifecycle) return;
    const sub = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        if (next === 'background' || next === 'inactive') {
          if (stableManager.state !== 'Disconnected') {
            stableManager.disconnect();
          }
        } else if (next === 'active') {
          if (stableManager.state === 'Disconnected') {
            stableManager.connect(url);
          }
        }
      },
    );
    return () => sub.remove();
  }, [stableManager, autoConnect, url, skipAppStateLifecycle]);

  const value = useMemo<SocketContextValue>(
    () => ({ state, manager: stableManager }),
    [state, stableManager],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocketState(): SocketConnectionState {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketState must be used inside SocketProvider');
  }
  return ctx.state;
}

export function useSocketManager() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketManager must be used inside SocketProvider');
  }
  return ctx.manager;
}
