import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { TestProviders } from '../helpers/TestProviders';
import { RouteContextProvider, useRouteContext } from '../../app/RouteContext';
import { DeepLinkProvider } from '../../app/providers/DeepLinkProvider';
import { DebugDeepLinkScreen } from '../../screens/DebugDeepLinkScreen';
import { Text } from 'react-native';

const navigationRef = { current: null } as any;

function CurrentRouteFlag() {
  const { current } = useRouteContext();
  return (
    <Text testID="current-route-kind">
      {current ? current.kind : 'none'}
    </Text>
  );
}

describe('G65: DebugDeepLinkScreen press → DeepLinkRouter.handle', () => {
  it('typing a URL and pressing Відкрити updates the centralized current route', async () => {
    render(
      <TestProviders skipSeed>
        <RouteContextProvider initial={null}>
          <DeepLinkProvider navigationRef={navigationRef} skipInitialUrl>
            <CurrentRouteFlag />
            <DebugDeepLinkScreen />
          </DeepLinkProvider>
        </RouteContextProvider>
      </TestProviders>,
    );

    fireEvent.changeText(
      screen.getByTestId('debug-deep-link-input'),
      'volunteerhub://requests/req-99',
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('debug-deep-link-open'));
    });

    expect(screen.getByTestId('current-route-kind').props.children).toBe(
      'Detail',
    );
  });
});
