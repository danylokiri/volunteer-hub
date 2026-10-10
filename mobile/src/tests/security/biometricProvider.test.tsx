import React, { useEffect } from 'react';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import {
  BiometricProvider,
  useBiometric,
} from '../../app/providers/BiometricProvider';
import { MockBiometricManager } from '../../security/MockBiometricManager';

function StateProbe() {
  const { state } = useBiometric();
  return <Text testID="state">{state}</Text>;
}

function AuthenticateButton({ reason = 'login' }: { reason?: string }) {
  const { authenticate } = useBiometric();
  return (
    <TouchableOpacity
      testID="auth-button"
      onPress={() => authenticate(reason)}
    >
      <Text>auth</Text>
    </TouchableOpacity>
  );
}

describe('Phase 8 — BiometricProvider state machine (F56–F58)', () => {
  it('F56: state transitions to Authenticating after authenticate() starts', async () => {
    const manager = new MockBiometricManager();
    let resolveAuth: ((value: { ok: true }) => void) | null = null;
    manager.authenticate = jest.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveAuth = resolve;
        }),
    );

    const Probe = () => {
      const { authenticate } = useBiometric();
      useEffect(() => {
        void authenticate('login');
      }, [authenticate]);
      return <StateProbe />;
    };

    render(
      <BiometricProvider manager={manager}>
        <Probe />
      </BiometricProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('state').props.children).toBe(
        'Authenticating',
      ),
    );

    await act(async () => {
      resolveAuth?.({ ok: true });
    });
  });

  it('F57: state transitions to Success after successful authenticate', async () => {
    const manager = new MockBiometricManager();
    manager.__setNextResult({ ok: true });
    const Probe = () => {
      const { authenticate } = useBiometric();
      useEffect(() => {
        void authenticate('login');
      }, [authenticate]);
      return <StateProbe />;
    };
    render(
      <BiometricProvider manager={manager}>
        <Probe />
      </BiometricProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('state').props.children).toBe('Success'),
    );
  });

  it('F58: state transitions to Failed after cancellation', async () => {
    const manager = new MockBiometricManager();
    manager.__setNextResult({ ok: false, reason: 'cancel' });
    const Probe = () => {
      const { authenticate } = useBiometric();
      useEffect(() => {
        void authenticate('login');
      }, [authenticate]);
      return <StateProbe />;
    };
    render(
      <BiometricProvider manager={manager}>
        <Probe />
      </BiometricProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('state').props.children).toBe('Failed'),
    );
  });

  it('F58b: state transitions to Unavailable when sensor missing', async () => {
    const manager = new MockBiometricManager({ initialAvailable: false });
    render(
      <BiometricProvider manager={manager}>
        <StateProbe />
        <AuthenticateButton />
      </BiometricProvider>,
    );
    // Initial hydration sets state to Unavailable when availability.available is false.
    await waitFor(() =>
      expect(screen.getByTestId('state').props.children).toBe('Unavailable'),
    );
  });
});
