import React from 'react';
import { AuthProvider } from '../../app/providers/AuthProvider';
import {
  BiometricProvider,
} from '../../app/providers/BiometricProvider';
import { RepositoryProvider } from '../../app/providers/RepositoryProvider';
import { HelpRequest } from '../../domain/models/HelpRequest';
import { VolunteerResponse } from '../../domain/models/VolunteerResponse';
import { NotificationEvent } from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import { MockBiometricManager } from '../../security/MockBiometricManager';
import { BiometricManager } from '../../security/BiometricManager';
import { ApiService } from '../../data/api/types';

type Props = {
  children: React.ReactNode;
  initialState?: {
    requests?: HelpRequest[];
    responses?: VolunteerResponse[];
    notifications?: NotificationEvent[];
    users?: UserProfile[];
  };
  skipSeed?: boolean;
  biometricManager?: BiometricManager;
  apiService?: ApiService;
};

export function TestProviders({
  children,
  initialState,
  skipSeed,
  biometricManager,
  apiService,
}: Props) {
  const manager = biometricManager ?? new MockBiometricManager();
  return (
    <AuthProvider apiService={apiService}>
      <BiometricProvider manager={manager}>
        <RepositoryProvider
          initialState={initialState}
          skipSeed={skipSeed}
          apiService={apiService}
        >
          {children}
        </RepositoryProvider>
      </BiometricProvider>
    </AuthProvider>
  );
}
