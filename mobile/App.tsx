import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  navigationRef,
  RootNavigator,
} from './src/app/navigation/RootNavigator';
import { AuthProvider } from './src/app/providers/AuthProvider';
import { RepositoryProvider } from './src/app/providers/RepositoryProvider';
import { SocketProvider } from './src/app/providers/SocketProvider';
import { DeepLinkProvider } from './src/app/providers/DeepLinkProvider';
import { BiometricProvider } from './src/app/providers/BiometricProvider';
import { ServerStatusProvider } from './src/app/providers/ServerStatusProvider';
import { RouteContextProvider } from './src/app/RouteContext';
import { LockManager } from './src/security/LockManager';
import { openProductionDb } from './src/data/local/SqliteLocalDataSource';
import { HttpApiService } from './src/data/api/ApiService';
import { getApiBaseUrl, getWsUrl } from './src/config/runtime';

export default function App() {
  const bundle = useMemo(() => openProductionDb(), []);
  const apiService = useMemo(
    () => new HttpApiService(getApiBaseUrl()),
    [],
  );
  const wsUrl = useMemo(() => getWsUrl(), []);

  return (
    <SafeAreaProvider>
      <AuthProvider apiService={apiService}>
        <BiometricProvider>
          <RepositoryProvider bundle={bundle} apiService={apiService} refreshOnMount>
            <ServerStatusProvider api={apiService} baseUrl={getApiBaseUrl()}>
              <RouteContextProvider>
                <SocketProvider url={wsUrl}>
                  <DeepLinkProvider navigationRef={navigationRef}>
                    <LockManager navigationRef={navigationRef} />
                    <RootNavigator />
                  </DeepLinkProvider>
                </SocketProvider>
              </RouteContextProvider>
            </ServerStatusProvider>
          </RepositoryProvider>
        </BiometricProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
