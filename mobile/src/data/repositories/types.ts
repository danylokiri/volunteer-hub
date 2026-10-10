// Repository interfaces. The same types are implemented in Phase 2 by
// in-memory providers and in Phase 3+ by SQLite-backed repositories
// composed with the API service. Screens depend on these interfaces
// only -- never on a concrete implementation.

import {
  CreateHelpRequestInput,
  HelpRequest,
} from '../../domain/models/HelpRequest';
import {
  CreateNotificationEventInput,
  NotificationEvent,
} from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import {
  CreateVolunteerResponseInput,
  VolunteerResponse,
} from '../../domain/models/VolunteerResponse';
import { Coordinates } from '../../domain/geo/distance';
import { RequestStatus } from '../../domain/enums';

export type RequestListFilter = {
  status?: RequestStatus;
  category?: string;
  nearby?: { reference: Coordinates; radiusKm: number };
  sortByDistanceFrom?: Coordinates;
};

export interface RequestRepository {
  list(filter?: RequestListFilter): Promise<HelpRequest[]>;
  getById(id: string): Promise<HelpRequest | undefined>;
  create(input: CreateHelpRequestInput): Promise<HelpRequest>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: RequestStatus): Promise<HelpRequest>;
  upsertFromRemote(remote: HelpRequest): Promise<void>;
}

export interface UserRepository {
  getById(id: string): Promise<UserProfile | undefined>;
  list(): Promise<UserProfile[]>;
  upsertFromRemote(remote: UserProfile): Promise<void>;
}

export interface ResponseRepository {
  listByRequest(requestId: string): Promise<VolunteerResponse[]>;
  create(input: CreateVolunteerResponseInput): Promise<VolunteerResponse>;
  delete(id: string): Promise<void>;
  upsertFromRemote(remote: VolunteerResponse): Promise<void>;
}

export interface NotificationRepository {
  list(): Promise<NotificationEvent[]>;
  create(input: CreateNotificationEventInput): Promise<NotificationEvent>;
  markRead(id: string): Promise<void>;
  appendFromSocket(event: NotificationEvent): Promise<void>;
}
