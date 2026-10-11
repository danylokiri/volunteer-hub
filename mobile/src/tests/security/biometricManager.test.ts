import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockBiometricManager } from '../../security/MockBiometricManager';
import {
  SECURITY_STORAGE_KEYS,
  SecuritySettingsStorage,
} from '../../security/SecuritySettingsStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Phase 8 — MockBiometricManager (F-group base)', () => {
  it('F48: checkAvailability returns { available: false, type: "none" } on no-sensor', async () => {
    const m = new MockBiometricManager({
      initialAvailable: false,
      initialType: 'none',
    });
    const a = await m.checkAvailability();
    expect(a).toEqual({ available: false, type: 'none' });
  });

  it('F49: checkAvailability returns { type: "faceId" } on supported device', async () => {
    const m = new MockBiometricManager({
      initialAvailable: true,
      initialType: 'faceId',
    });
    const a = await m.checkAvailability();
    expect(a.available).toBe(true);
    expect(a.type).toBe('faceId');
  });

  it('F50: authenticate resolves { ok: true } on mock success', async () => {
    const m = new MockBiometricManager();
    m.__setNextResult({ ok: true });
    expect(await m.authenticate('login')).toEqual({ ok: true });
  });

  it('F51: authenticate resolves { ok: false, reason: "cancel" } on user cancel', async () => {
    const m = new MockBiometricManager();
    m.__setNextResult({ ok: false, reason: 'cancel' });
    expect(await m.authenticate('login')).toEqual({
      ok: false,
      reason: 'cancel',
    });
  });

  it('F52: authenticate resolves { ok: false, reason: "system" } on system error', async () => {
    const m = new MockBiometricManager();
    m.__setNextResult({ ok: false, reason: 'system' });
    expect(await m.authenticate('login')).toEqual({
      ok: false,
      reason: 'system',
    });
  });

  it('F53: authenticate resolves { ok: false, reason: "unavailable" } when sensor absent', async () => {
    const m = new MockBiometricManager({ initialAvailable: false });
    expect(await m.authenticate('login')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('F54: isEnabledByUser reads stored value', async () => {
    const m = new MockBiometricManager();
    expect(await m.isEnabledByUser()).toBe(false);
    await m.setEnabledByUser(true);
    expect(await m.isEnabledByUser()).toBe(true);
  });

  it('F55: setEnabledByUser persists across simulated restart', async () => {
    const m1 = new MockBiometricManager();
    await m1.setEnabledByUser(true);
    const m2 = new MockBiometricManager();
    expect(await m2.isEnabledByUser()).toBe(true);
    // AsyncStorage cleared in beforeEach so this test is in isolation.
    const raw = await AsyncStorage.getItem(SECURITY_STORAGE_KEYS.biometricEnabled);
    expect(raw).toBe('true');
  });

  it('F59: __setNextResult controls outcomes deterministically', async () => {
    const m = new MockBiometricManager();
    m.__setNextResult({ ok: true });
    expect((await m.authenticate('a')).ok).toBe(true);
    m.__setNextResult({ ok: false, reason: 'cancel' });
    const second = await m.authenticate('b');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('cancel');
  });
});

describe('Phase 8 — SecuritySettingsStorage', () => {
  it('lock timeout default + clamping', async () => {
    expect(await SecuritySettingsStorage.getLockTimeoutSeconds()).toBe(60);
    await SecuritySettingsStorage.setLockTimeoutSeconds(99999);
    expect(await SecuritySettingsStorage.getLockTimeoutSeconds()).toBe(600);
    await SecuritySettingsStorage.setLockTimeoutSeconds(-50);
    expect(await SecuritySettingsStorage.getLockTimeoutSeconds()).toBe(0);
  });

  it('pendingDestination round-trip', async () => {
    expect(await SecuritySettingsStorage.getPendingDestination()).toBeNull();
    await SecuritySettingsStorage.setPendingDestination({
      kind: 'Detail',
      id: 'r-1',
    });
    expect(await SecuritySettingsStorage.getPendingDestination()).toEqual({
      kind: 'Detail',
      id: 'r-1',
    });
    await SecuritySettingsStorage.setPendingDestination(null);
    expect(await SecuritySettingsStorage.getPendingDestination()).toBeNull();
  });
});
