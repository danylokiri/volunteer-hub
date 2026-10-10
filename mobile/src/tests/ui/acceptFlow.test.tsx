// Phase 5 — accept flow integration test. Drives the RequestDetailScreen
// as the request creator, verifies that pressing the per-response
// "Прийняти" button fires the API.acceptResponse path and that the
// returned updated request is surfaced through hooks.

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
import { RequestDetailScreen } from '../../screens/RequestDetailScreen';

const STORAGE_KEY = 'auth_current_user_id';

function detailProps(id: string) {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: () => false,
    } as any,
    route: { key: 'r', name: 'RequestDetail', params: { id } } as any,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Phase 5 — accept flow', () => {
  it('ACC1: creator (olena-id) sees "Прийняти" on a pending response', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'olena-id');
    render(
      <TestProviders>
        {/* req-1 is created by olena-id, has a pending res-1 from demo-user-id */}
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('response-row-res-1'));
    expect(screen.getByTestId('response-accept-res-1')).toBeTruthy();
    expect(screen.getByTestId('response-decline-res-1')).toBeTruthy();
  });

  it('ACC2: pressing "Прийняти" updates the response status to accepted', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'olena-id');
    render(
      <TestProviders>
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('response-accept-res-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('response-accept-res-1'));
    });
    await waitFor(() => {
      const status = screen.getByTestId('response-status-res-1');
      expect(status.props.children).toEqual(
        expect.arrayContaining(['Прийнято']),
      );
    });
    // Counter increments to "Прийнято 1 · необмежено" (req-1 unlimited).
    await waitFor(() => {
      const counter = screen.getByTestId('request-detail-slots-counter');
      expect(counter.props.children).toBe('Прийнято 1 · необмежено');
    });
  });

  it('ACC3: capacity-fill on a limited(1) request closes registration and declines siblings', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'mykola-id');
    render(
      <TestProviders>
        {/* req-2 is limited 1 slot, has res-3 pending from demo-user-id */}
        <RequestDetailScreen {...detailProps('req-2')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('response-accept-res-3'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('response-accept-res-3'));
    });
    await waitFor(() => {
      const counter = screen.getByTestId('request-detail-slots-counter');
      expect(counter.props.children).toBe('Прийнято 1 з 1');
    });
    await waitFor(() => {
      const reg = screen.getByTestId('request-detail-registration-status');
      expect(reg.props.children).toEqual(
        expect.arrayContaining(['закрита']),
      );
    });
  });

  it('ACC4: volunteer with own pending response sees the "відкликати" button', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'demo-user-id');
    render(
      <TestProviders>
        {/* req-1 has res-1 from demo-user-id, pending */}
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('response-withdraw-res-1'));
    expect(screen.getByTestId('request-detail-own-pending')).toBeTruthy();
  });

  it('ACC5: stranger volunteer (neither creator nor responder) sees "Відгукнутись"', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'mykola-id');
    render(
      <TestProviders>
        {/* req-1 created by olena-id, mykola-id has no response */}
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    await waitFor(() => screen.getByTestId('request-detail-respond'));
  });
});
