// Real BiometricManager wrapping expo-local-authentication. Maps the
// Expo enums to our internal `BiometricSensorType` and `reason` codes
// so the rest of the app stays decoupled from the SDK.

import * as LocalAuth from 'expo-local-authentication';
import { SecuritySettingsStorage } from './SecuritySettingsStorage';

export type BiometricSensorType =
  | 'faceId'
  | 'touchId'
  | 'fingerprint'
  | 'none';

export type BiometricAvailability = {
  available: boolean;
  type: BiometricSensorType;
};

export type BiometricAuthResult =
  | { ok: true }
  | { ok: false; reason: 'cancel' | 'system' | 'unavailable' };

export interface BiometricManager {
  checkAvailability(): Promise<BiometricAvailability>;
  authenticate(reason: string): Promise<BiometricAuthResult>;
  isEnabledByUser(): Promise<boolean>;
  setEnabledByUser(value: boolean): Promise<void>;
}

function toSensorType(types: number[]): BiometricSensorType {
  if (
    types.includes(
      LocalAuth.AuthenticationType.FACIAL_RECOGNITION as unknown as number,
    )
  ) {
    return 'faceId';
  }
  if (
    types.includes(
      LocalAuth.AuthenticationType.FINGERPRINT as unknown as number,
    )
  ) {
    // iOS exposes Touch ID as FINGERPRINT too, so the label is best-effort.
    return 'fingerprint';
  }
  if (types.length > 0) return 'touchId';
  return 'none';
}

export class ExpoBiometricManager implements BiometricManager {
  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const enrolled = await LocalAuth.isEnrolledAsync();
      const types = await LocalAuth.supportedAuthenticationTypesAsync();
      const available = hasHardware && enrolled;
      return {
        available,
        type: available ? toSensorType(types as unknown as number[]) : 'none',
      };
    } catch {
      return { available: false, type: 'none' };
    }
  }

  async authenticate(reason: string): Promise<BiometricAuthResult> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      return { ok: false, reason: 'unavailable' };
    }
    try {
      const result = await LocalAuth.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Скасувати',
      });
      if (result.success) return { ok: true };
      const cancelled =
        result.error === 'user_cancel' ||
        result.error === 'system_cancel' ||
        result.error === 'app_cancel' ||
        result.error === 'user_fallback';
      return { ok: false, reason: cancelled ? 'cancel' : 'system' };
    } catch {
      return { ok: false, reason: 'system' };
    }
  }

  isEnabledByUser(): Promise<boolean> {
    return SecuritySettingsStorage.isBiometricEnabled();
  }

  setEnabledByUser(value: boolean): Promise<void> {
    return SecuritySettingsStorage.setBiometricEnabled(value);
  }
}
