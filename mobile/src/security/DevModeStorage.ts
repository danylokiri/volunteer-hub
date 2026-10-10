// Persists the dev-mode flag (the 7-tap unlock from Phase 9) under a
// dedicated AsyncStorage key. Reset on logout. Pure async wrapper —
// has zero React dependencies so it can be exercised from non-React
// tests.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'devmode.enabled';

export const DevModeStorage = {
  async isEnabled(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(KEY);
      return v === '1';
    } catch {
      return false;
    }
  },
  async enable(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch {
      // ignore — dev-mode is best-effort.
    }
  },
  async disable(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
