import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { SecuritySettingsScreen } from '../../screens/SecuritySettingsScreen';
import { MockBiometricManager } from '../../security/MockBiometricManager';

describe('Phase 8 — biometric UX text', () => {
  it('BX1: shows the autoblock description text in plain Ukrainian', () => {
    render(
      <TestProviders skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );
    const desc = screen.getByTestId('security-settings-autoblock-description');
    expect(desc.props.children).toContain(
      'після повернення потрібно підтвердити особу через біометрію',
    );
  });

  it('BX2: lock timeout buttons render human labels not raw seconds', () => {
    render(
      <TestProviders skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );
    // The "1 хвилина" label also appears in the "Поточний таймаут" row
    // because that's the default. Use getAllByText to allow that.
    expect(screen.getAllByText('30 секунд').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 хвилина').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 хвилини').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5 хвилин').length).toBeGreaterThan(0);
  });

  it('BX3: unavailable callout is shown when no sensor', () => {
    render(
      <TestProviders skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );
    expect(
      screen.getByTestId('security-settings-unavailable-callout'),
    ).toBeTruthy();
    // The callout body guides the user to Android Studio fingerprint setup.
    expect(screen.getByText(/Android Studio/)).toBeTruthy();
    expect(screen.getByText(/Fingerprint Unlock/)).toBeTruthy();
  });

  it('BX4: unavailable callout disappears once availability hydrates true', async () => {
    const manager = new MockBiometricManager({
      initialAvailable: true,
      initialType: 'fingerprint',
    });
    render(
      <TestProviders biometricManager={manager} skipSeed>
        <SecuritySettingsScreen />
      </TestProviders>,
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId('security-settings-unavailable-callout'),
      ).toBeNull(),
    );
    const sensor = screen.getByTestId('security-settings-sensor-type');
    expect(sensor.props.children).toBe('Відбиток пальця');
  });
});
