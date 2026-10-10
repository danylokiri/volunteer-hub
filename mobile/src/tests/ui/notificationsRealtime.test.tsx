import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { NotificationsScreen } from '../../screens/NotificationsScreen';
import { SocketProvider } from '../../app/providers/SocketProvider';
import { MockSocketManager } from '../../realtime/MockSocketManager';
import { useRepositoryHydration } from '../../app/providers/RepositoryProvider';
import { Text } from 'react-native';

function HydrationFlag() {
  const isHydrated = useRepositoryHydration();
  return <Text testID="hydrated-flag">{isHydrated ? 'yes' : 'no'}</Text>;
}

describe('G66: NotificationsScreen reacts to a WebSocket-style event without manual refresh', () => {
  it('shows a new notification after MockSocketManager emits notification.created', async () => {
    const manager = new MockSocketManager({ manual: true });

    render(
      <TestProviders skipSeed>
        <HydrationFlag />
        <SocketProvider manager={manager} autoConnect>
          <NotificationsScreen />
        </SocketProvider>
      </TestProviders>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('hydrated-flag').props.children).toBe('yes'),
    );

    expect(screen.getByTestId('notifications-empty')).toBeTruthy();

    await act(async () => {
      manager.emit({
        type: 'notification.created',
        payload: {
          id: 'live-1',
          type: 'request.created',
          payload: { foo: 'bar' },
          createdAt: '2026-04-30T12:00:00Z',
          read: false,
        },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId('notification-row-live-1')).toBeTruthy(),
    );
  });
});
