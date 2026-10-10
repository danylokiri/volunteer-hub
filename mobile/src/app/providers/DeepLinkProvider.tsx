// Wires the DeepLinkRouter to: (a) the navigation ref so it can reset
// the stack, (b) AuthProvider so it can gate Invite links, (c)
// AsyncStorage so the pending destination survives an app cold start
// across the login flow, (d) expo-linking for cold + warm + foreground
// URL delivery.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Destination } from '../../domain/destinations/Destination';
import { DeepLinkRouter } from '../../deeplink/DeepLinkRouter';
import { MockDeepLinkRouter } from '../../deeplink/MockDeepLinkRouter';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from './AuthProvider';
import { useRouteContext } from '../RouteContext';

const PENDING_KEY = 'pending_destination';

type DeepLinkContextValue = {
  router: DeepLinkRouter;
  mockRouter: MockDeepLinkRouter;
};

const DeepLinkContext = createContext<DeepLinkContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  /** Test override -- skips the cold-start `getInitialURL` call. */
  skipInitialUrl?: boolean;
};

/**
 * Builds a CommonActions.reset action for the given Destination.
 * Exported so the deep-link unit tests can inspect the navigation
 * intent without needing a real NavigationContainer. Every result is
 * a `RESET` action because deep links from outside the app must not
 * leave breadcrumb screens behind, and pressing the same link twice
 * reproduces the same final stack rather than accumulating duplicates.
 */
export function destinationToNavigationAction(dest: Destination) {
  switch (dest.kind) {
    case 'Home':
      return CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    case 'Detail':
      return CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'RequestDetail', params: { id: dest.id } },
        ],
      });
    case 'Catalog':
      return CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: {
              index: 0,
              routes: [
                {
                  name: 'Requests',
                  params: dest.filter ? { filter: dest.filter } : undefined,
                },
              ],
            },
          },
        ],
      });
    case 'Invite':
      return CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'Invite', params: { token: dest.token } },
        ],
      });
    case 'Notifications':
      return CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: {
              index: 0,
              routes: [{ name: 'Notifications' }],
            },
          },
        ],
      });
    case 'Profile':
      return CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: {
              index: 0,
              routes: [{ name: 'Profile' }],
            },
          },
        ],
      });
    case 'Security':
      return CommonActions.reset({
        index: 1,
        routes: [{ name: 'MainTabs' }, { name: 'SecuritySettings' }],
      });
  }
}

export function DeepLinkProvider({
  children,
  navigationRef,
  skipInitialUrl,
}: ProviderProps) {
  const { currentUserId } = useAuth();
  const { setCurrent } = useRouteContext();
  const authRef = useRef(currentUserId);
  authRef.current = currentUserId;

  const router = useMemo(
    () =>
      new DeepLinkRouter({
        navigateToDestination: (dest) => {
          setCurrent(dest);
          const action = destinationToNavigationAction(dest);
          if (navigationRef.current?.isReady()) {
            navigationRef.current.dispatch(action);
          }
        },
        isAuthenticated: () => Boolean(authRef.current),
        persistPendingDestination: (dest) => {
          void AsyncStorage.setItem(PENDING_KEY, JSON.stringify(dest));
        },
        navigateToLogin: () => {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
            );
          }
        },
      }),
    [navigationRef, setCurrent],
  );

  const mockRouter = useMemo(() => new MockDeepLinkRouter(router), [router]);

  // Cold start.
  useEffect(() => {
    if (skipInitialUrl) return;
    Linking.getInitialURL()
      .then((url) => {
        if (url) router.handle(url);
      })
      .catch(() => {
        /* ignore */
      });
  }, [router, skipInitialUrl]);

  // Warm start / foreground.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => router.handle(url));
    return () => sub.remove();
  }, [router]);

  // Resume pending destination after login.
  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!alive) return;
        if (!raw) return;
        try {
          const dest = JSON.parse(raw) as Destination;
          router.navigate(dest);
        } catch {
          /* ignore */
        }
        return AsyncStorage.removeItem(PENDING_KEY);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentUserId, router]);

  const value = useMemo<DeepLinkContextValue>(
    () => ({ router, mockRouter }),
    [router, mockRouter],
  );

  return (
    <DeepLinkContext.Provider value={value}>
      {children}
    </DeepLinkContext.Provider>
  );
}

export function useDeepLinkRouter(): DeepLinkRouter {
  const ctx = useContext(DeepLinkContext);
  if (!ctx) {
    throw new Error('useDeepLinkRouter must be used inside DeepLinkProvider');
  }
  return ctx.router;
}

export function useMockDeepLinkRouter(): MockDeepLinkRouter {
  const ctx = useContext(DeepLinkContext);
  if (!ctx) {
    throw new Error('useMockDeepLinkRouter must be used inside DeepLinkProvider');
  }
  return ctx.mockRouter;
}
