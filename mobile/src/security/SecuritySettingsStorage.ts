// Thin AsyncStorage wrapper for security-adjacent settings. Anything
// that needs to survive across an app restart and isn't a primary
// domain entity goes through this module.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Destination } from '../domain/destinations/Destination';

const KEYS = {
  biometricEnabled: 'biometric_enabled',
  lockTimeoutSeconds: 'lock_timeout_seconds',
  pendingDestination: 'pending_destination',
} as const;

export const DEFAULT_LOCK_TIMEOUT_SECONDS = 60;
export const MIN_LOCK_TIMEOUT_SECONDS = 0;
export const MAX_LOCK_TIMEOUT_SECONDS = 600;

export const SecuritySettingsStorage = {
  async isBiometricEnabled(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(KEYS.biometricEnabled);
    return raw === 'true';
  },
  async setBiometricEnabled(value: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.biometricEnabled, value ? 'true' : 'false');
  },

  async getLockTimeoutSeconds(): Promise<number> {
    const raw = await AsyncStorage.getItem(KEYS.lockTimeoutSeconds);
    if (!raw) return DEFAULT_LOCK_TIMEOUT_SECONDS;
    const n = Number(raw);
    if (Number.isNaN(n)) return DEFAULT_LOCK_TIMEOUT_SECONDS;
    return Math.min(MAX_LOCK_TIMEOUT_SECONDS, Math.max(MIN_LOCK_TIMEOUT_SECONDS, n));
  },
  async setLockTimeoutSeconds(value: number): Promise<void> {
    const clamped = Math.min(
      MAX_LOCK_TIMEOUT_SECONDS,
      Math.max(MIN_LOCK_TIMEOUT_SECONDS, Math.round(value)),
    );
    await AsyncStorage.setItem(KEYS.lockTimeoutSeconds, String(clamped));
  },

  async getPendingDestination(): Promise<Destination | null> {
    const raw = await AsyncStorage.getItem(KEYS.pendingDestination);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Destination;
    } catch {
      return null;
    }
  },
  async setPendingDestination(dest: Destination | null): Promise<void> {
    if (dest === null) {
      await AsyncStorage.removeItem(KEYS.pendingDestination);
    } else {
      await AsyncStorage.setItem(KEYS.pendingDestination, JSON.stringify(dest));
    }
  },
};

export const SECURITY_STORAGE_KEYS = KEYS;
