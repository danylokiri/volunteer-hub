import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { AdminScreen } from '../../screens/AdminScreen';
import { TestProviders } from '../helpers/TestProviders';

const STORAGE_KEY = 'auth_current_user_id';

function profileProps() {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
    } as any,
    route: { key: 'r', name: 'Profile', params: undefined } as any,
  };
}

function adminProps() {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
    } as any,
    route: { key: 'r', name: 'AdminPanel', params: undefined } as any,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Phase 4 — admin role + Profile gating', () => {
  it('AP1: admin link is hidden for the demo (non-admin) user', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-full-name'));
    expect(screen.queryByTestId('profile-admin-link')).toBeNull();
  });

  it('AP2: admin link is visible for the seeded admin user', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'admin-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-admin-link'));
  });

  it('AP3: roles chips render for the demo user', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-roles'));
    // Default seed gives demo user: requester, volunteer.
    expect(screen.getByText('Замовник')).toBeTruthy();
    expect(screen.getByText('Волонтер')).toBeTruthy();
  });

  it('AP4: AdminScreen blocks non-admin users', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <AdminScreen {...adminProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('admin-screen-denied'));
  });

  it('AP5: AdminScreen renders the request list for admins', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'admin-user-id');
    render(
      <TestProviders>
        <AdminScreen {...adminProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('admin-screen'));
    expect(screen.getByTestId('admin-request-req-1')).toBeTruthy();
    expect(screen.getByTestId('admin-request-req-2')).toBeTruthy();
  });
});

describe('Phase 9 — dev-mode unlock', () => {
  it('DM1: debug link is hidden by default for the demo user', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-full-name'));
    expect(screen.queryByTestId('profile-debug-link')).toBeNull();
    expect(screen.queryByTestId('profile-dev-section')).toBeNull();
  });

  it('DM2: 7 taps on the name unlocks the dev section', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-name-press'));

    const press = screen.getByTestId('profile-name-press');
    for (let i = 0; i < 7; i += 1) {
      fireEvent.press(press);
    }

    await waitFor(() => screen.getByTestId('profile-dev-section'));
    expect(screen.getByTestId('profile-debug-link')).toBeTruthy();
    expect(screen.getByTestId('profile-dev-toast')).toBeTruthy();
  });

  it('DM3: 6 taps does NOT unlock', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        <ProfileScreen {...profileProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('profile-name-press'));
    const press = screen.getByTestId('profile-name-press');
    for (let i = 0; i < 6; i += 1) {
      fireEvent.press(press);
    }
    expect(screen.queryByTestId('profile-dev-section')).toBeNull();
  });
});
