import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { RequestsListScreen } from '../../screens/RequestsListScreen';
import { CreateRequestScreen } from '../../screens/CreateRequestScreen';
import {
  useRepositoryHydration,
  useRequests,
} from '../../app/providers/RepositoryProvider';
import { Text, TouchableOpacity } from 'react-native';

const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
} as any;

const requestsRoute = { key: 'r', name: 'Requests', params: undefined } as any;
const createRoute = { key: 'c', name: 'Create', params: undefined } as any;

jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

function HydrationFlag() {
  const isHydrated = useRepositoryHydration();
  return <Text testID="hydrated-flag">{isHydrated ? 'yes' : 'no'}</Text>;
}

function DeleteFirstRequestButton() {
  const { requests, delete: deleteRequest } = useRequests();
  const first = requests[0];
  if (!first) return <Text testID="delete-no-first">none</Text>;
  return (
    <TouchableOpacity
      testID="delete-first"
      onPress={() => deleteRequest(first.id)}
    >
      <Text>Delete {first.id}</Text>
    </TouchableOpacity>
  );
}

describe('G62: create flow', () => {
  it('CreateRequestScreen submit adds an item visible on RequestsListScreen', async () => {
    render(
      <TestProviders skipSeed>
        <HydrationFlag />
        <CreateRequestScreen navigation={mockNav} route={createRoute} />
        <RequestsListScreen navigation={mockNav} route={requestsRoute} />
      </TestProviders>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('hydrated-flag').props.children).toBe('yes'),
    );
    expect(screen.getByTestId('requests-list-empty')).toBeTruthy();

    fireEvent.changeText(
      screen.getByTestId('create-request-title'),
      'Тестовий запит',
    );
    fireEvent.changeText(
      screen.getByTestId('create-request-description'),
      'опис тестового запиту',
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('create-request-submit'));
    });

    await waitFor(() =>
      expect(screen.getByText('Тестовий запит')).toBeTruthy(),
    );
    expect(screen.queryByTestId('requests-list-empty')).toBeNull();
  });
});

describe('G63: delete flow', () => {
  it('Repository.delete removes the item from RequestsListScreen', async () => {
    render(
      <TestProviders>
        <HydrationFlag />
        <DeleteFirstRequestButton />
        <RequestsListScreen navigation={mockNav} route={requestsRoute} />
      </TestProviders>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('hydrated-flag').props.children).toBe('yes'),
    );

    // After hydration, capture the id that the button will delete.
    const initialRows = screen.getAllByTestId(/^request-row-/);
    expect(initialRows.length).toBeGreaterThan(0);
    const firstRowId = initialRows[0].props.testID;

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-first'));
    });

    await waitFor(() =>
      expect(screen.queryByTestId(firstRowId)).toBeNull(),
    );
  });
});
