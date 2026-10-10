// AppState listener that pushes the Lock screen when the user returns
// from a long enough background and biometric is enabled. Runs as a
// React component so it can `useBiometric` and read the navigation
// ref. Mounted once near the root.

import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { useBiometric } from '../app/providers/BiometricProvider';
import { SecuritySettingsStorage } from './SecuritySettingsStorage';
import { RootStackParamList } from '../app/navigation/types';
import { useAuth } from '../app/providers/AuthProvider';

type Props = {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
};

export function LockManager({ navigationRef }: Props) {
  const { enabled, availability } = useBiometric();
  const { currentUserId } = useAuth();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      async (next: AppStateStatus) => {
        if (next === 'background' || next === 'inactive') {
          backgroundedAt.current = Date.now();
        } else if (next === 'active') {
          const bg = backgroundedAt.current;
          backgroundedAt.current = null;
          if (bg === null) return;
          if (!currentUserId) return;
          if (!enabled || !availability.available) return;
          const timeoutSec =
            await SecuritySettingsStorage.getLockTimeoutSeconds();
          if (timeoutSec <= 0) return;
          if (Date.now() - bg < timeoutSec * 1000) return;
          if (!navigationRef.current?.isReady()) return;

          // Avoid pushing duplicate Lock screens.
          const state = navigationRef.current.getRootState();
          const top = state?.routes?.[state.routes.length - 1];
          if (top && top.name === 'Lock') return;
          navigationRef.current.dispatch(
            CommonActions.navigate({ name: 'Lock', params: {} }),
          );
        }
      },
    );
    return () => sub.remove();
  }, [navigationRef, enabled, availability.available, currentUserId]);

  return null;
}
