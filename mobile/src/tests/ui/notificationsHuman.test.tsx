import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { NotificationsScreen } from '../../screens/NotificationsScreen';

describe('Phase 7 — human notifications', () => {
  it('NH1: renders the pre-rendered title from seeded notifications', () => {
    render(
      <TestProviders>
        <NotificationsScreen />
      </TestProviders>,
    );
    const title = screen.getByTestId('notification-title-notif-1');
    expect(title.props.children).toBe('Новий відгук на вашу заявку');
  });

  it('NH2: renders the human message line', () => {
    render(
      <TestProviders>
        <NotificationsScreen />
      </TestProviders>,
    );
    const msg = screen.getByTestId('notification-message-notif-1');
    expect(msg.props.children).toBe('Тестовий Користувач хоче допомогти');
  });

  it('NH3: shows a "view request" link when relatedRequestId is set', () => {
    render(
      <TestProviders>
        <NotificationsScreen />
      </TestProviders>,
    );
    expect(screen.getByTestId('notification-link-notif-1')).toBeTruthy();
  });

  it('NH4: does NOT render any "{...}"-shaped JSON in the rendered tree', () => {
    render(
      <TestProviders>
        <NotificationsScreen />
      </TestProviders>,
    );
    // Sanity: any text that starts with "{" was the old JSON.stringify
    // payload. None should be on screen.
    expect(screen.queryByText(/^{.*}$/)).toBeNull();
  });
});
