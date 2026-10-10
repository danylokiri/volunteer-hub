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
import { LoginScreen } from '../../screens/LoginScreen';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { MockApiService } from '../../data/api/MockApiService';

const dispatch = jest.fn();
function loginProps() {
  dispatch.mockClear();
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch,
    } as any,
    route: { key: 'r', name: 'Login', params: undefined } as any,
  };
}
function registerProps() {
  dispatch.mockClear();
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch,
    } as any,
    route: { key: 'r', name: 'Register', params: undefined } as any,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Phase 6 — LoginScreen', () => {
  it('LOG1: requires email and password before submit', async () => {
    const api = new MockApiService();
    render(
      <TestProviders apiService={api}>
        <LoginScreen {...loginProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('login-submit'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });
    await waitFor(() => screen.getByTestId('login-error'));
    expect(screen.getByTestId('login-error').props.children).toContain(
      'email і пароль',
    );
  });

  it('LOG2: rejects bad credentials with the localized error', async () => {
    const api = new MockApiService();
    render(
      <TestProviders apiService={api}>
        <LoginScreen {...loginProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('login-email'));
    fireEvent.changeText(screen.getByTestId('login-email'), 'demo@volunteerhub.local');
    fireEvent.changeText(screen.getByTestId('login-password'), 'wrong');
    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });
    await waitFor(() => screen.getByTestId('login-error'));
    expect(screen.getByTestId('login-error').props.children).toContain(
      'Невірний email або пароль',
    );
  });

  it('LOG3: valid credentials reset to MainTabs', async () => {
    const api = new MockApiService();
    const props = loginProps();
    render(
      <TestProviders apiService={api}>
        <LoginScreen {...props} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('login-email'));
    fireEvent.changeText(
      screen.getByTestId('login-email'),
      'demo@volunteerhub.local',
    );
    fireEvent.changeText(screen.getByTestId('login-password'), 'demo1234');
    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });
    await waitFor(() => expect(props.navigation.dispatch).toHaveBeenCalled());
    const action = props.navigation.dispatch.mock.calls[0][0];
    // CommonActions.reset → routes[0].name === 'MainTabs'
    expect(action.payload?.routes?.[0]?.name).toBe('MainTabs');
  });

  it('LOG4: register link is present', async () => {
    render(
      <TestProviders>
        <LoginScreen {...loginProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('login-register-link'));
  });
});

describe('Phase 6 — RegisterScreen', () => {
  it('REG1: blocks short fullName / bad email / short password', async () => {
    render(
      <TestProviders>
        <RegisterScreen {...registerProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('register-submit'));
    fireEvent.changeText(screen.getByTestId('register-full-name'), 'Z');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-submit'));
    });
    expect(screen.getByTestId('register-error').props.children).toContain(
      'мінімум 2 символи',
    );

    fireEvent.changeText(screen.getByTestId('register-full-name'), 'Імʼя');
    fireEvent.changeText(screen.getByTestId('register-email'), 'not-an-email');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-submit'));
    });
    expect(screen.getByTestId('register-error').props.children).toContain(
      'email',
    );

    fireEvent.changeText(screen.getByTestId('register-email'), 'good@x.io');
    fireEvent.changeText(screen.getByTestId('register-password'), '12');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-submit'));
    });
    expect(screen.getByTestId('register-error').props.children).toContain(
      'щонайменше 4 символи',
    );
  });

  it('REG2: successful register resets to MainTabs', async () => {
    const api = new MockApiService();
    const props = registerProps();
    render(
      <TestProviders apiService={api}>
        <RegisterScreen {...props} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('register-submit'));
    fireEvent.changeText(screen.getByTestId('register-full-name'), 'Нова Особа');
    fireEvent.changeText(
      screen.getByTestId('register-email'),
      'new-person@x.io',
    );
    fireEvent.changeText(screen.getByTestId('register-password'), 'pass1234');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-submit'));
    });
    await waitFor(() => expect(props.navigation.dispatch).toHaveBeenCalled());
    const action = props.navigation.dispatch.mock.calls[0][0];
    expect(action.payload?.routes?.[0]?.name).toBe('MainTabs');
  });

  it('REG3: duplicate email surfaces a localized error', async () => {
    const api = new MockApiService();
    render(
      <TestProviders apiService={api}>
        <RegisterScreen {...registerProps()} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('register-submit'));
    fireEvent.changeText(screen.getByTestId('register-full-name'), 'Дублікат');
    fireEvent.changeText(
      screen.getByTestId('register-email'),
      // demo email already seeded into MockApiService
      'demo@volunteerhub.local',
    );
    fireEvent.changeText(screen.getByTestId('register-password'), 'demo1234');
    await act(async () => {
      fireEvent.press(screen.getByTestId('register-submit'));
    });
    await waitFor(() => screen.getByTestId('register-error'));
    expect(screen.getByTestId('register-error').props.children).toContain(
      'вже зареєстрована',
    );
  });

  it('REG4: admin login round-trip via MockApiService', async () => {
    const api = new MockApiService();
    api.__seedAuth('admin@volunteerhub.local', 'admin1234', 'admin-user-id');
    const result = await api.login({
      email: 'admin@volunteerhub.local',
      password: 'admin1234',
    });
    expect(result.userId).toBe('admin-user-id');
    expect(result.roles).toContain('admin');
  });
});
