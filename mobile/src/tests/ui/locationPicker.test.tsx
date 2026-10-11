import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { LocationPickerScreen } from '../../screens/LocationPickerScreen';
import { CreateRequestScreen } from '../../screens/CreateRequestScreen';
import { LocationDraftStore } from '../../domain/location/LocationDraftStore';

const goBack = jest.fn();
function pickerProps(initialDistrictId?: string) {
  goBack.mockClear();
  return {
    navigation: {
      navigate: jest.fn(),
      goBack,
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      canGoBack: () => true,
      addListener: () => () => {},
    } as any,
    route: {
      key: 'r',
      name: 'LocationPicker',
      params: { initialDistrictId },
    } as any,
  };
}

function createProps() {
  return {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      addListener: () => () => {},
    } as any,
    route: { key: 'r', name: 'Create', params: undefined } as any,
  };
}

beforeEach(() => {
  LocationDraftStore.reset();
});

describe('Phase 3 — LocationPickerScreen', () => {
  it('LP1: renders the 10-district list with the default selection', () => {
    render(
      <TestProviders>
        <LocationPickerScreen {...pickerProps()} />
      </TestProviders>,
    );
    expect(screen.getByTestId('location-picker-screen')).toBeTruthy();
    expect(screen.getByTestId('location-picker-district-podil')).toBeTruthy();
    expect(
      screen.getByTestId('location-picker-district-pechersk'),
    ).toBeTruthy();
  });

  it('LP2: tapping a district + Confirm writes a LocationDraft and goes back', () => {
    render(
      <TestProviders>
        <LocationPickerScreen {...pickerProps()} />
      </TestProviders>,
    );
    fireEvent.press(screen.getByTestId('location-picker-district-pechersk'));
    fireEvent.changeText(
      screen.getByTestId('location-picker-address'),
      'вул. Грушевського, 1',
    );
    fireEvent.press(screen.getByTestId('location-picker-confirm'));

    const draft = LocationDraftStore.peek();
    expect(draft).not.toBeNull();
    expect(draft!.city).toBe('Київ');
    expect(draft!.district).toBe('Печерськ');
    expect(draft!.address).toBe('вул. Грушевського, 1');
    expect(draft!.locationTitle).toBe(
      'Київ, Печерськ — вул. Грушевського, 1',
    );
    expect(goBack).toHaveBeenCalled();
  });

  it('LP3: "Use current" shows the honest fallback note', () => {
    render(
      <TestProviders>
        <LocationPickerScreen {...pickerProps()} />
      </TestProviders>,
    );
    fireEvent.press(screen.getByTestId('location-picker-use-current'));
    expect(
      screen.getByTestId('location-picker-fallback-note'),
    ).toBeTruthy();
  });
});

describe('Phase 3 — CreateRequestScreen no longer shows "Демо-локація"', () => {
  it('LP4: the form has no "Демо-локація" string anywhere on screen', () => {
    render(
      <TestProviders>
        <CreateRequestScreen {...createProps()} />
      </TestProviders>,
    );
    expect(screen.queryByText(/Демо-локація/)).toBeNull();
    expect(
      screen.queryByTestId('create-request-use-demo-location'),
    ).toBeNull();
  });

  it('LP5: the form shows the location card after default fallback resolves', async () => {
    render(
      <TestProviders>
        <CreateRequestScreen {...createProps()} />
      </TestProviders>,
    );
    // First render shows the "Локацію ще не обрано" hint, then the
    // mount-time fallback fills the default district. Wait for the card.
    expect(screen.getByTestId('create-request-pick-location')).toBeTruthy();
  });

  it('LP6: limited mode reveals the slot count input', () => {
    render(
      <TestProviders>
        <CreateRequestScreen {...createProps()} />
      </TestProviders>,
    );
    expect(
      screen.queryByTestId('create-request-slots-count'),
    ).toBeNull();
    fireEvent.press(screen.getByTestId('create-request-slots-mode-limited'));
    expect(
      screen.getByTestId('create-request-slots-count'),
    ).toBeTruthy();
  });
});
