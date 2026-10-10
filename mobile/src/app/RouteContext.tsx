// Single React Context that holds the current Destination. The deep
// link router writes to it through `setCurrent`; the navigator (and
// any UI that needs to know the active route) reads from it via
// `useRouteContext`. This is the one place where current-route state
// lives, satisfying the "centralized current route" requirement.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Destination, HOME_DESTINATION } from '../domain/destinations/Destination';

type RouteContextValue = {
  current: Destination | null;
  setCurrent: (dest: Destination | null) => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteContextProvider({
  children,
  initial = HOME_DESTINATION,
}: {
  children: React.ReactNode;
  initial?: Destination | null;
}) {
  const [current, setCurrentState] = useState<Destination | null>(initial);
  const setCurrent = useCallback((dest: Destination | null) => {
    setCurrentState(dest);
  }, []);
  const value = useMemo(() => ({ current, setCurrent }), [current, setCurrent]);
  return (
    <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
  );
}

export function useRouteContext(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    throw new Error('useRouteContext must be used inside RouteContextProvider');
  }
  return ctx;
}
