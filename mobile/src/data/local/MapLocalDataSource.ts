// Map-backed LocalDataSource. Used by tests and as the implementation
// chosen when the SQLite native module is unavailable. Holds a single
// shared `Store` object so a "simulated restart" test can drop the
// data-source instance and create a fresh one over the same store --
// proving that the on-disk persistence contract is satisfied at the
// LocalDataSource interface level.

import { HelpRequest } from '../../domain/models/HelpRequest';
import { NotificationEvent } from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import { VolunteerResponse } from '../../domain/models/VolunteerResponse';
import { RequestStatus, SyncStatus } from '../../domain/enums';
import {
  LocalDataSourceBundle,
  NotificationLocalDataSource,
  RequestLocalDataSource,
  ResponseLocalDataSource,
  UserLocalDataSource,
} from './types';

export type MapLocalStore = {
  requests: Map<string, HelpRequest>;
  users: Map<string, UserProfile>;
  responses: Map<string, VolunteerResponse>;
  notifications: Map<string, NotificationEvent>;
};

export function createEmptyMapStore(): MapLocalStore {
  return {
    requests: new Map(),
    users: new Map(),
    responses: new Map(),
    notifications: new Map(),
  };
}

class MapRequestDS implements RequestLocalDataSource {
  constructor(private store: MapLocalStore) {}
  async save(r: HelpRequest) {
    this.store.requests.set(r.id, { ...r });
  }
  async list(filter?: { status?: RequestStatus; category?: string }) {
    let result = Array.from(this.store.requests.values());
    if (filter?.status) result = result.filter((r) => r.status === filter.status);
    if (filter?.category)
      result = result.filter((r) => r.category === filter.category);
    return result.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  async getById(id: string) {
    return this.store.requests.get(id);
  }
  async delete(id: string) {
    this.store.requests.delete(id);
  }
  async markSyncStatus(id: string, status: SyncStatus) {
    const existing = this.store.requests.get(id);
    if (!existing) return;
    this.store.requests.set(id, { ...existing, syncStatus: status });
  }
  async upsertMany(requests: HelpRequest[]) {
    for (const r of requests) this.store.requests.set(r.id, { ...r });
  }
}

class MapUserDS implements UserLocalDataSource {
  constructor(private store: MapLocalStore) {}
  async save(u: UserProfile) {
    this.store.users.set(u.id, { ...u });
  }
  async list() {
    return Array.from(this.store.users.values());
  }
  async getById(id: string) {
    return this.store.users.get(id);
  }
  async delete(id: string) {
    this.store.users.delete(id);
  }
}

class MapResponseDS implements ResponseLocalDataSource {
  constructor(private store: MapLocalStore) {}
  async save(r: VolunteerResponse) {
    this.store.responses.set(r.id, { ...r });
  }
  async listByRequest(requestId: string) {
    return Array.from(this.store.responses.values()).filter(
      (r) => r.requestId === requestId,
    );
  }
  async getById(id: string) {
    return this.store.responses.get(id);
  }
  async delete(id: string) {
    this.store.responses.delete(id);
  }
  async markSyncStatus(id: string, status: SyncStatus) {
    const existing = this.store.responses.get(id);
    if (!existing) return;
    this.store.responses.set(id, { ...existing, syncStatus: status });
  }
}

class MapNotificationDS implements NotificationLocalDataSource {
  constructor(private store: MapLocalStore) {}
  async save(e: NotificationEvent) {
    this.store.notifications.set(e.id, { ...e });
  }
  async list(filter?: { read?: boolean }) {
    let result = Array.from(this.store.notifications.values());
    if (filter && typeof filter.read === 'boolean')
      result = result.filter((n) => n.read === filter.read);
    return result.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  async getById(id: string) {
    return this.store.notifications.get(id);
  }
  async markRead(id: string) {
    const existing = this.store.notifications.get(id);
    if (!existing) return;
    this.store.notifications.set(id, { ...existing, read: true });
  }
  async delete(id: string) {
    this.store.notifications.delete(id);
  }
}

export class MapLocalDataSourceBundle implements LocalDataSourceBundle {
  requests: RequestLocalDataSource;
  users: UserLocalDataSource;
  responses: ResponseLocalDataSource;
  notifications: NotificationLocalDataSource;

  constructor(public store: MapLocalStore = createEmptyMapStore()) {
    this.requests = new MapRequestDS(store);
    this.users = new MapUserDS(store);
    this.responses = new MapResponseDS(store);
    this.notifications = new MapNotificationDS(store);
  }

  async initialize() {
    // No-op for in-memory store.
  }

  async reset() {
    this.store.requests.clear();
    this.store.users.clear();
    this.store.responses.clear();
    this.store.notifications.clear();
  }
}
