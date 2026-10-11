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
import { RespondScreen } from '../../screens/RespondScreen';

const STORAGE_KEY = 'auth_current_user_id';

function makeProps(requestId: string) {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: () => false,
    } as any,
    route: { key: 'r', name: 'Respond', params: { requestId } } as any,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Phase 5 — RespondScreen', () => {
  it('RS1: blocks empty message and surfaces validation error', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'mykola-id');
    render(
      <TestProviders>
        <RespondScreen {...makeProps('req-1')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('respond-screen-submit'));
    fireEvent.press(screen.getByTestId('respond-screen-submit'));
    await waitFor(() => screen.getByTestId('respond-screen-error'));
    expect(screen.getByTestId('respond-screen-error').props.children).toContain(
      'обовʼязкове',
    );
  });

  it('RS2: shows the closed-registration warning when status is closed', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'mykola-id');
    render(
      <TestProviders>
        {/* req-6 is closed in the seed (status completed, registration closed) */}
        <RespondScreen {...makeProps('req-6')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('respond-screen-closed'));
    const submit = screen.getByTestId('respond-screen-submit');
    expect(submit.props.accessibilityState?.disabled).toBe(true);
  });

  it('RS3: submits a response and shows success path (Alert)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'mykola-id');
    const props = makeProps('req-1');
    render(
      <TestProviders>
        <RespondScreen {...props} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('respond-screen-message'));
    await act(async () => {
      fireEvent.changeText(
        screen.getByTestId('respond-screen-message'),
        'Можу допомогти ввечері',
      );
      fireEvent.changeText(
        screen.getByTestId('respond-screen-contact'),
        '+380501112233',
      );
    });
    // Spy Alert.alert before pressing submit.
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    await act(async () => {
      fireEvent.press(screen.getByTestId('respond-screen-submit'));
    });
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
