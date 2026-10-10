import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TestProviders } from '../helpers/TestProviders';
import { SecuritySettingsScreen } from '../../screens/SecuritySettingsScreen';
import {
  MockBiometricManager,
} from '../../security/MockBiometricManager';
import {
  SECURITY_STORAGE_KEYS,
} from '../../security/SecuritySettingsStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('G64: SecuritySettingsScreen toggle persists value through storage', () => {
  it('toggling biometric enabled persists to storage', async () => {
    const manager = new MockBiometricManager({
      initialAvailable: true,
      initialType: 'faceId',
    });
    render(
      <TestProviders biometricManager={manager} skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );

    const toggle = screen.getByTestId('security-settings-biometric-toggle');
    expect(toggle.props.value).toBe(false);

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem(
        SECURITY_STORAGE_KEYS.biometricEnabled,
      );
      expect(stored).toBe('true');
    });
  });

  it('lock timeout selection writes to storage', async () => {
    render(
      <TestProviders skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('security-settings-timeout-300'));
    });
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(
        SECURITY_STORAGE_KEYS.lockTimeoutSeconds,
      );
      expect(raw).toBe('300');
    });
  });
});
