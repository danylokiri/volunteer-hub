// Test/dev BiometricManager. Configurable next-result + per-method
// availability override so tests can exercise every branch of the
// state machine.

import {
  BiometricAuthResult,
  BiometricAvailability,
  BiometricManager,
  BiometricSensorType,
} from './BiometricManager';
import { SecuritySettingsStorage } from './SecuritySettingsStorage';

export type MockOptions = {
  initialAvailable?: boolean;
  initialType?: BiometricSensorType;
};

export class MockBiometricManager implements BiometricManager {
  private nextResult: BiometricAuthResult = { ok: true };
  private availability: BiometricAvailability;

  constructor(opts: MockOptions = {}) {
    this.availability = {
      available: opts.initialAvailable ?? true,
      type: opts.initialType ?? 'faceId',
    };
  }

  async checkAvailability(): Promise<BiometricAvailability> {
    return { ...this.availability };
  }

  async authenticate(_reason: string): Promise<BiometricAuthResult> {
    void _reason;
    if (!this.availability.available) {
      return { ok: false, reason: 'unavailable' };
    }
    // Allow the test to set a one-shot value; subsequent calls return
    // the same value (the test should call __setNextResult again).
    return this.nextResult;
  }

  isEnabledByUser(): Promise<boolean> {
    return SecuritySettingsStorage.isBiometricEnabled();
  }

  setEnabledByUser(value: boolean): Promise<void> {
    return SecuritySettingsStorage.setBiometricEnabled(value);
  }

  // Test helpers ---------------------------------------------------------
  __setNextResult(result: BiometricAuthResult): void {
    this.nextResult = result;
  }

  __setAvailability(value: BiometricAvailability): void {
    this.availability = { ...value };
  }
}
