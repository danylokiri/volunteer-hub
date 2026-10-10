import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RequestsListScreen } from '../../screens/RequestsListScreen';
import { RequestDetailScreen } from '../../screens/RequestDetailScreen';
import { TestProviders } from '../helpers/TestProviders';

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

describe('Phase 2 — human location UX', () => {
  it('HLUI1: list rows show city · district as primary, no raw coords by default', () => {
    render(
      <TestProviders>
        <RequestsListScreen {...listProps} />
      </TestProviders>,
    );

    const primary = screen.getByTestId('request-row-location-req-1');
    expect(primary.props.children).toEqual(
      expect.arrayContaining([expect.stringContaining('Київ · Поділ')]),
    );
    // Coords should NOT be present by default.
    expect(screen.queryByTestId('request-row-coords-req-1')).toBeNull();
  });

  it('HLUI2: list rows show secondary address text', () => {
    render(
      <TestProviders>
        <RequestsListScreen {...listProps} />
      </TestProviders>,
    );
    const secondary = screen.getByTestId('request-row-address-req-1');
    expect(secondary.props.children).toBe('вул. Нижній Вал, 15');
  });

  it('HLUI3: list rows show a friendly sync-status badge, not the raw enum', () => {
    render(
      <TestProviders>
        <RequestsListScreen {...listProps} />
      </TestProviders>,
    );
    const badge = screen.getByTestId('request-row-sync-req-1');
    expect(badge.props.children).toBe('✓ Синхронізовано');
  });

  it('HLUI4: detail screen shows human location primary and secondary', () => {
    render(
      <TestProviders>
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    const primary = screen.getByTestId('request-detail-location-primary');
    expect(primary.props.children).toEqual(
      expect.arrayContaining([expect.stringContaining('Київ · Поділ')]),
    );
    const secondary = screen.getByTestId('request-detail-location-secondary');
    expect(secondary.props.children).toBe('вул. Нижній Вал, 15');
  });

  it('HLUI5: detail screen hides technical coords by default and reveals on toggle', () => {
    render(
      <TestProviders>
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    expect(screen.queryByTestId('request-detail-coords')).toBeNull();
    fireEvent.press(screen.getByTestId('request-detail-technical-toggle'));
    const coords = screen.getByTestId('request-detail-coords');
    expect(coords.props.children).toEqual(
      expect.arrayContaining([expect.stringContaining(',')]),
    );
  });

  it('HLUI6: detail screen surfaces volunteer-capacity counter', () => {
    render(
      <TestProviders>
        <RequestDetailScreen {...detailProps('req-2')} />
      </TestProviders>,
    );
    const counter = screen.getByTestId('request-detail-slots-counter');
    expect(counter.props.children).toBe('Прийнято 0 з 1');
  });

  it('HLUI7: detail screen surfaces unlimited-mode counter for req-1', () => {
    render(
      <TestProviders>
        <RequestDetailScreen {...detailProps('req-1')} />
      </TestProviders>,
    );
    const counter = screen.getByTestId('request-detail-slots-counter');
    expect(counter.props.children).toBe('Прийнято 0 · необмежено');
  });
});
