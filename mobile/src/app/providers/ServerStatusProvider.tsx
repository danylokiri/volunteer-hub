// Polls /health on an interval and remembers the last successful sync
// timestamp + the last realtime event time (set externally by
// SocketProvider). The hook surface is intentionally minimal.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ServerStatusService,
  ServerStatusSnapshot,
} from '../../data/api/ServerStatusService';
import { ApiService } from '../../data/api/types';
import { useRepositoryBundle } from './RepositoryProvider';
import { getApiBaseUrl } from '../../config/runtime';

export type ServerStatusValue = {
  online: boolean;
  latencyMs: number;
  baseUrl: string;
  lastSyncAt: string | null;
  lastSocketEventAt: string | null;
  errorMessage?: string;
  reportSocketEvent: (iso?: string) => void;
  refresh: () => Promise<void>;
};

const ServerStatusContext = createContext<ServerStatusValue | null>(null);

type Props = {
  children: React.ReactNode;
  api?: ApiService;
  baseUrl?: string;
  /** Polling interval in ms. Tests pass a small number; default is 30s. */
  intervalMs?: number;
  /** When false, no polling occurs (tests). */
  autoPoll?: boolean;
};

export function ServerStatusProvider({
  children,
  api,
  baseUrl,
  intervalMs = 30_000,
  autoPoll = true,
}: Props) {
  const repos = useRepositoryBundle();
  const apiToUse = api ?? repos.api;
  const serviceRef = useRef<ServerStatusService>(
    new ServerStatusService(apiToUse),
  );

  const [snapshot, setSnapshot] = useState<ServerStatusSnapshot>({
    online: false,
    latencyMs: 0,
    ts: '',
  });
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSocketEventAt, setLastSocketEventAt] = useState<string | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const next = await serviceRef.current.ping();
    setSnapshot(next);
    if (next.online) setLastSyncAt(next.ts);
  }, []);

  useEffect(() => {
    if (!autoPoll) return;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoPoll, intervalMs, refresh]);

  const reportSocketEvent = useCallback((iso?: string) => {
    setLastSocketEventAt(iso ?? new Date().toISOString());
  }, []);

  const value = useMemo<ServerStatusValue>(
    () => ({
      online: snapshot.online,
      latencyMs: snapshot.latencyMs,
      baseUrl: baseUrl ?? getApiBaseUrl(),
      lastSyncAt,
      lastSocketEventAt,
      errorMessage: snapshot.errorMessage,
      reportSocketEvent,
      refresh,
    }),
    [
      snapshot.online,
      snapshot.latencyMs,
      snapshot.errorMessage,
      baseUrl,
      lastSyncAt,
      lastSocketEventAt,
      reportSocketEvent,
      refresh,
    ],
  );

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatus(): ServerStatusValue {
  const ctx = useContext(ServerStatusContext);
  if (!ctx) {
    // Allow consumers to render without crashing when the provider is
    // not mounted (e.g. tests for older screens).
    return {
      online: false,
      latencyMs: 0,
      baseUrl: getApiBaseUrl(),
      lastSyncAt: null,
      lastSocketEventAt: null,
      reportSocketEvent: () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
