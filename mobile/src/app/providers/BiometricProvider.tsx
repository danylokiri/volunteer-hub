// Centralizes BiometricAuthState so screens never re-implement the
// "are we authenticating right now?" dance. Wraps a BiometricManager
// (real or mock) and exposes typed hooks.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BiometricAuthState } from '../../domain/enums';
import {
  BiometricAvailability,
  BiometricAuthResult,
  BiometricManager,
  ExpoBiometricManager,
} from '../../security/BiometricManager';

type BiometricContextValue = {
  state: BiometricAuthState;
  availability: BiometricAvailability;
  enabled: boolean;
  refreshEnabled: () => Promise<void>;
  setEnabledByUser: (value: boolean) => Promise<void>;
  authenticate: (reason: string) => Promise<BiometricAuthResult>;
  manager: BiometricManager;
};

const BiometricContext = createContext<BiometricContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  manager?: BiometricManager;
};

const SUCCESS_RESET_MS = 1000;

export function BiometricProvider({ children, manager }: ProviderProps) {
  const stableManager = useMemo<BiometricManager>(
    () => manager ?? new ExpoBiometricManager(),
    [manager],
  );

  const [state, setState] = useState<BiometricAuthState>('Idle');
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    type: 'none',
  });
  const [enabled, setEnabled] = useState(false);

  // Hydrate availability + enabled flag once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await stableManager.checkAvailability();
      const e = await stableManager.isEnabledByUser();
      if (!alive) return;
      setAvailability(a);
      setEnabled(e);
      if (!a.available) setState('Unavailable');
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [stableManager]);

  const refreshEnabled = useCallback(async () => {
    const e = await stableManager.isEnabledByUser();
    setEnabled(e);
  }, [stableManager]);

  const setEnabledByUser = useCallback(
    async (value: boolean) => {
      await stableManager.setEnabledByUser(value);
      setEnabled(value);
    },
    [stableManager],
  );

  const authenticate = useCallback(
    async (reason: string): Promise<BiometricAuthResult> => {
      setState('Authenticating');
      const result = await stableManager.authenticate(reason);
      if (result.ok) {
        setState('Success');
        // Drop back to Idle so a subsequent attempt starts clean.
        setTimeout(() => setState('Idle'), SUCCESS_RESET_MS);
      } else if (result.reason === 'unavailable') {
        setState('Unavailable');
      } else {
        setState('Failed');
      }
      return result;
    },
    [stableManager],
  );

  const value = useMemo<BiometricContextValue>(
    () => ({
      state,
      availability,
      enabled,
      refreshEnabled,
      setEnabledByUser,
      authenticate,
      manager: stableManager,
    }),
    [
      state,
      availability,
      enabled,
      refreshEnabled,
      setEnabledByUser,
      authenticate,
      stableManager,
    ],
  );

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric(): BiometricContextValue {
  const ctx = useContext(BiometricContext);
  if (!ctx) {
    throw new Error('useBiometric must be used inside BiometricProvider');
  }
  return ctx;
}
