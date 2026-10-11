import React from 'react';
import { AppState, Text } from 'react-native';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { SocketProvider } from '../../app/providers/SocketProvider';
import { MockSocketManager } from '../../realtime/MockSocketManager';
import { useRepositoryHydration } from '../../app/providers/RepositoryProvider';

function HydratedFlag() {
  const isHydrated = useRepositoryHydration();
  return <Text testID="hydrated">{isHydrated ? 'yes' : 'no'}</Text>;
}

type AppStateChangeHandler = (state: string) => void;

function captureAppStateHandlers() {
  const handlers: AppStateChangeHandler[] = [];
  const spy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(((event: string, handler: AppStateChangeHandler) => {
      if (event === 'change') handlers.push(handler);
      return { remove: jest.fn() } as { remove: () => void };
    }) as unknown as typeof AppState.addEventListener);
  return { handlers, spy };
}

describe('Phase audit fix F-001 — SocketProvider AppState lifecycle', () => {
  it('connects on mount', async () => {
    const manager = new MockSocketManager({ manual: true });
    const connect = jest.spyOn(manager, 'connect');

    render(
      <TestProviders skipSeed>
        <HydratedFlag />
        <SocketProvider manager={manager} autoConnect>
          <Text>socket</Text>
        </SocketProvider>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('hydrated').props.children).toBe('yes'),
    );
    expect(connect).toHaveBeenCalled();
    expect(manager.state).toBe('Connected');
  });

  it('background transition triggers disconnect; active transition reconnects', async () => {
    const manager = new MockSocketManager({ manual: true });
    const { handlers } = captureAppStateHandlers();

    render(
      <TestProviders skipSeed>
        <HydratedFlag />
        <SocketProvider manager={manager} autoConnect>
          <Text>socket</Text>
        </SocketProvider>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('hydrated').props.children).toBe('yes'),
    );
    expect(manager.state).toBe('Connected');

    // Find the AppState handler installed by SocketProvider (it's the
    // last one captured in this test context).
    const handler = handlers[handlers.length - 1];
    expect(handler).toBeDefined();

    const disconnect = jest.spyOn(manager, 'disconnect');
    const connect = jest.spyOn(manager, 'connect');

    await act(async () => handler('background'));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(manager.state).toBe('Disconnected');

    await act(async () => handler('active'));
    expect(connect).toHaveBeenCalledTimes(1);
    expect(manager.state).toBe('Connected');
  });

  it('does not duplicate connect if AppState becomes active while already connected', async () => {
    const manager = new MockSocketManager({ manual: true });
    const { handlers } = captureAppStateHandlers();

    render(
      <TestProviders skipSeed>
        <HydratedFlag />
        <SocketProvider manager={manager} autoConnect>
          <Text>socket</Text>
        </SocketProvider>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('hydrated').props.children).toBe('yes'),
    );
    expect(manager.state).toBe('Connected');

    const handler = handlers[handlers.length - 1];
    const connect = jest.spyOn(manager, 'connect');

    // Simulate a spurious "active" while already connected.
    await act(async () => handler('active'));
    expect(connect).not.toHaveBeenCalled();
    expect(manager.state).toBe('Connected');
  });

  it('does not duplicate disconnect on repeated background transitions', async () => {
    const manager = new MockSocketManager({ manual: true });
    const { handlers } = captureAppStateHandlers();

    render(
      <TestProviders skipSeed>
        <HydratedFlag />
        <SocketProvider manager={manager} autoConnect>
          <Text>socket</Text>
        </SocketProvider>
      </TestProviders>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('hydrated').props.children).toBe('yes'),
    );

    const handler = handlers[handlers.length - 1];
    const disconnect = jest.spyOn(manager, 'disconnect');

    await act(async () => handler('background'));
    await act(async () => handler('inactive'));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
