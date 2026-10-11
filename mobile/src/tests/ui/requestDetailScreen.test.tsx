import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RequestDetailScreen } from '../../screens/RequestDetailScreen';
import { TestProviders } from '../helpers/TestProviders';
import { createHelpRequest } from '../../domain/models/HelpRequest';

function makeProps(id: string) {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
    } as any,
    route: { key: 'r', name: 'RequestDetail', params: { id } } as any,
  };
}

describe('G61: RequestDetailScreen renders selected HelpRequest data', () => {
  it('renders the title, description, status, sync status, coords for the selected request', () => {
    const props = makeProps('req-1');

    render(
      <TestProviders>
        <RequestDetailScreen {...props} />
      </TestProviders>,
    );

    expect(screen.getByTestId('request-detail-screen')).toBeTruthy();
    expect(screen.getByTestId('request-detail-title').props.children).toBe(
      'Вигуляти собаку',
    );
    expect(
      screen.getByTestId('request-detail-status').props.children,
    ).toBe('Відкритий');
    expect(
      screen.getByTestId('request-detail-sync-status').props.children,
    ).toBe('synced');
    // Description is interpolated as-is.
    expect(screen.getByTestId('request-detail-description')).toBeTruthy();
  });

  it('shows "не знайдено" when the request id is unknown', () => {
    const props = makeProps('does-not-exist');
    render(
      <TestProviders>
        <RequestDetailScreen {...props} />
      </TestProviders>,
    );
    expect(screen.getByTestId('request-detail-not-found')).toBeTruthy();
  });

  it('reflects request data passed via custom initialState', () => {
    const props = makeProps('custom-detail');
    const custom = createHelpRequest({
      id: 'custom-detail',
      title: 'Тестова деталь',
      description: 'Це опис',
      category: 'pets',
      status: 'in_progress',
      latitude: 50.0,
      longitude: 30.0,
      createdByUserId: 'u',
      syncStatus: 'synced',
    });

    render(
      <TestProviders skipSeed initialState={{ requests: [custom] }}>
        <RequestDetailScreen {...props} />
      </TestProviders>,
    );

    expect(screen.getByTestId('request-detail-title').props.children).toBe(
      'Тестова деталь',
    );
    expect(
      screen.getByTestId('request-detail-status').props.children,
    ).toBe('В процесі');
  });
});
