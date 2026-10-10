import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RequestsListScreen } from '../../screens/RequestsListScreen';
import { TestProviders } from '../helpers/TestProviders';
import { createHelpRequest } from '../../domain/models/HelpRequest';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
} as unknown as React.ComponentProps<typeof RequestsListScreen>['navigation'];

const mockRoute = { key: 'r', name: 'Requests', params: undefined } as any;

describe('G60: RequestsListScreen renders rows from Repository', () => {
  it('renders one card per request from the seed (no hardcoded array)', () => {
    render(
      <TestProviders>
        <RequestsListScreen navigation={mockNavigation} route={mockRoute} />
      </TestProviders>,
    );

    // Seed contains the "Вигуляти собаку" entry with id req-1.
    expect(screen.getByTestId('request-row-req-1')).toBeTruthy();
    expect(screen.getByText('Вигуляти собаку')).toBeTruthy();
    expect(screen.getByText('Купити продукти')).toBeTruthy();
    expect(screen.getByText('Допомога з ноутбуком')).toBeTruthy();
  });

  it('renders an empty state when the repository has no requests', () => {
    render(
      <TestProviders skipSeed>
        <RequestsListScreen navigation={mockNavigation} route={mockRoute} />
      </TestProviders>,
    );

    expect(screen.getByTestId('requests-list-empty')).toBeTruthy();
  });

  it('reflects custom initialState passed to the provider', () => {
    const custom = createHelpRequest({
      id: 'custom-1',
      title: 'Тестовий запит',
      description: 'опис',
      category: 'other',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      syncStatus: 'synced',
    });
    render(
      <TestProviders skipSeed initialState={{ requests: [custom] }}>
        <RequestsListScreen navigation={mockNavigation} route={mockRoute} />
      </TestProviders>,
    );

    expect(screen.getByText('Тестовий запит')).toBeTruthy();
    expect(screen.getByTestId('request-row-custom-1')).toBeTruthy();
  });
});
