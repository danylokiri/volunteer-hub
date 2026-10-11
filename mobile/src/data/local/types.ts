// LocalDataSource interfaces. The Map-backed implementation under
// `MapLocalDataSource.ts` is used by tests; the expo-sqlite-backed
// implementation under `SqliteLocalDataSource.ts` is used in production.
// Both must satisfy the same contract, so screens/repositories can swap
// implementations transparently.

import { HelpRequest } from '../../domain/models/HelpRequest';
import { NotificationEvent } from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import { VolunteerResponse } from '../../domain/models/VolunteerResponse';
import { RequestStatus, SyncStatus } from '../../domain/enums';

export interface RequestLocalDataSource {
  save(request: HelpRequest): Promise<void>;
  list(filter?: { status?: RequestStatus; category?: string }): Promise<HelpRequest[]>;
  getById(id: string): Promise<HelpRequest | undefined>;
  delete(id: string): Promise<void>;
  markSyncStatus(id: string, status: SyncStatus): Promise<void>;
  upsertMany(requests: HelpRequest[]): Promise<void>;
}

export interface UserLocalDataSource {
  save(user: UserProfile): Promise<void>;
  list(): Promise<UserProfile[]>;
  getById(id: string): Promise<UserProfile | undefined>;
  delete(id: string): Promise<void>;
}

export interface ResponseLocalDataSource {
  save(response: VolunteerResponse): Promise<void>;
  listByRequest(requestId: string): Promise<VolunteerResponse[]>;
  getById(id: string): Promise<VolunteerResponse | undefined>;
  delete(id: string): Promise<void>;
  markSyncStatus(id: string, status: SyncStatus): Promise<void>;
}

export interface NotificationLocalDataSource {
  save(event: NotificationEvent): Promise<void>;
  list(filter?: { read?: boolean }): Promise<NotificationEvent[]>;
  getById(id: string): Promise<NotificationEvent | undefined>;
  markRead(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LocalDataSourceBundle {
  initialize(): Promise<void>;
  reset(): Promise<void>;
  requests: RequestLocalDataSource;
  users: UserLocalDataSource;
  responses: ResponseLocalDataSource;
  notifications: NotificationLocalDataSource;
}
