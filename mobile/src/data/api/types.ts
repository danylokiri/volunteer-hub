// API contract surface the mobile app expects from the backend-lite
// server. Phase 4 implements both a real ApiService (using fetch) and a
// MockApiService (in-memory) that returns seeded data with configurable
// delays/failures. RepositoryProvider takes either implementation.
//
// Phase-12 sprint update: extended with capacity-aware response endpoints
// (accept/decline/withdraw + registration toggle) and the auth pair.

import { HelpRequest } from '../../domain/models/HelpRequest';
import { NotificationEvent } from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import { VolunteerResponse } from '../../domain/models/VolunteerResponse';
import {
  RegistrationStatus,
  RequestStatus,
  UserRole,
  VolunteerSlotsMode,
} from '../../domain/enums';

export type ListRequestsParams = {
  lat?: number;
  lng?: number;
  radius?: number;
  status?: RequestStatus;
  category?: string;
};

export type CreateRequestBody = {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  createdByUserId: string;
  city?: string;
  district?: string;
  address?: string;
  locationTitle?: string;
  volunteerSlotsMode?: VolunteerSlotsMode;
  volunteerSlots?: number;
};

export type CreateResponseBody = {
  volunteerId: string;
  message: string;
  contact?: string;
  comment?: string;
};

export type PatchStatusBody = {
  status: RequestStatus;
  assignedVolunteerId?: string;
  requestedByVolunteerId?: string;
};

export type PatchRegistrationBody = {
  status: RegistrationStatus;
  declinePending?: boolean;
};

export type AcceptResponseResult = {
  response: VolunteerResponse;
  request: HelpRequest;
};

export type RegistrationChangeResult = {
  request: HelpRequest;
  declined: VolunteerResponse[];
};

export type RegisterUserBody = {
  fullName: string;
  email: string;
  password: string;
  wantsToVolunteer?: boolean;
};

export type LoginBody = {
  email: string;
  password: string;
};

export type AuthLoginResult = {
  userId: string;
  user: UserProfile;
  roles: UserRole[];
};

export interface ApiService {
  health(): Promise<{ ok: true; ts: string }>;

  listRequests(params?: ListRequestsParams): Promise<HelpRequest[]>;
  getRequest(id: string): Promise<HelpRequest>;
  createRequest(body: CreateRequestBody): Promise<HelpRequest>;
  createResponse(
    requestId: string,
    body: CreateResponseBody,
  ): Promise<VolunteerResponse>;
  acceptResponse(
    requestId: string,
    responseId: string,
  ): Promise<AcceptResponseResult>;
  declineResponse(
    requestId: string,
    responseId: string,
  ): Promise<VolunteerResponse>;
  withdrawResponse(
    requestId: string,
    responseId: string,
    volunteerId: string,
  ): Promise<VolunteerResponse>;
  setRegistrationStatus(
    requestId: string,
    body: PatchRegistrationBody,
  ): Promise<RegistrationChangeResult>;
  patchStatus(id: string, body: PatchStatusBody): Promise<HelpRequest>;

  getUser(id: string): Promise<UserProfile>;
  listNotifications(userId: string): Promise<NotificationEvent[]>;

  register(body: RegisterUserBody): Promise<AuthLoginResult>;
  login(body: LoginBody): Promise<AuthLoginResult>;
}
