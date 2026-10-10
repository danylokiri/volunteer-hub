import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { RequestsListScreen } from '../../screens/RequestsListScreen';
import { ServerStatusProvider } from '../../app/providers/ServerStatusProvider';
import { MockApiService } from '../../data/api/MockApiService';

const listProps = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
  } as any,
  route: { key: 'r', name: 'Requests', params: undefined } as any,
};

describe('Phase 10 — server status banner', () => {
  it('SB1: defaults to offline when no provider is mounted', () => {
    render(
      <TestProviders>
        <RequestsListScreen {...listProps} />
      </TestProviders>,
    );
    const banner = screen.getByTestId('requests-list-status-banner');
    expect(banner.props.children).toBeDefined();
    // Without provider, status falls back to offline; copy contains
    // "офлайн" prefix.
    const inner = screen.getByText(/Працюємо офлайн/);
    expect(inner).toBeTruthy();
  });

  it('SB2: renders the green online banner once provider polls successfully', async () => {
    const api = new MockApiService();
    render(
      <TestProviders apiService={api}>
        <ServerStatusProvider api={api} autoPoll intervalMs={100}>
          <RequestsListScreen {...listProps} />
        </ServerStatusProvider>
      </TestProviders>,
    );
    await waitFor(() => {
      const onlineText = screen.queryByText(/🟢 Онлайн/);
      expect(onlineText).toBeTruthy();
    });
  });

  it('SB3: renders the offline banner when /health throws', async () => {
    const api = new MockApiService({ failOn: new Set(['health']) });
    render(
      <TestProviders apiService={api}>
        <ServerStatusProvider api={api} autoPoll intervalMs={100}>
          <RequestsListScreen {...listProps} />
        </ServerStatusProvider>
      </TestProviders>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Працюємо офлайн/)).toBeTruthy();
    });
  });
});
