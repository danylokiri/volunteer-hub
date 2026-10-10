// Orchestrates LocalDataSource + ApiService for HelpRequest under the
// "mix" sync strategy:
//  - list/getById: read local first, return immediately, fire API
//    refresh in the background, upsert into local on success.
//  - create/updateStatus: write local with syncStatus="pending", call
//    API; on success flip to "synced", on failure flip to "error".
// Every state change emits a change event so the provider can re-read
// state without polling.

import { ApiService } from '../api/types';
import { ApiError } from '../api/ApiError';
import { RequestLocalDataSource } from '../local/types';
import { ChangeEmitter } from './BaseRepository';
import {
  CreateHelpRequestInput,
  createHelpRequest,
  HelpRequest,
} from '../../domain/models/HelpRequest';
import { RequestStatus } from '../../domain/enums';
import { nowIso } from '../../domain/idGenerator';

export type RequestRepositoryDeps = {
  local: RequestLocalDataSource;
  api: ApiService;
};

export class RequestRepository {
  changes = new ChangeEmitter();

  constructor(private deps: RequestRepositoryDeps) {}

  async list(filter?: {
    status?: RequestStatus;
    category?: string;
  }): Promise<HelpRequest[]> {
    return this.deps.local.list(filter);
  }

  async getById(id: string): Promise<HelpRequest | undefined> {
    return this.deps.local.getById(id);
  }

  /** Online-first refresh; merges remote into local; safe on API failure. */
  async refreshFromApi(params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    status?: RequestStatus;
    category?: string;
  }): Promise<{ ok: boolean }> {
    try {
      const remote = await this.deps.api.listRequests(params);
      // Mark them all synced -- they came from the server.
      const synced = remote.map((r) => ({ ...r, syncStatus: 'synced' as const }));
      await this.deps.local.upsertMany(synced);
      this.changes.emit();
      return { ok: true };
    } catch {
      // Keep cached local data visible; do not surface to UI.
      return { ok: false };
    }
  }

  /** Local-first create. Returns the final state (synced or error). */
  async create(input: CreateHelpRequestInput): Promise<HelpRequest> {
    const draft = createHelpRequest({ ...input, syncStatus: 'pending' });
    await this.deps.local.save(draft);
    this.changes.emit();

    try {
      const remote = await this.deps.api.createRequest({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        latitude: draft.latitude,
        longitude: draft.longitude,
        createdByUserId: draft.createdByUserId,
      });
      // Keep the local id stable; merge server-side fields onto it.
      const synced: HelpRequest = {
        ...draft,
        ...remote,
        id: draft.id,
        syncStatus: 'synced',
      };
      await this.deps.local.save(synced);
      this.changes.emit();
      return synced;
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) {
        await this.deps.local.markSyncStatus(draft.id, 'error');
      } else {
        await this.deps.local.markSyncStatus(draft.id, 'error');
      }
      this.changes.emit();
      const errored = await this.deps.local.getById(draft.id);
      return errored ?? { ...draft, syncStatus: 'error' };
    }
  }

  async delete(id: string): Promise<void> {
    await this.deps.local.delete(id);
    this.changes.emit();
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<HelpRequest> {
    const existing = await this.deps.local.getById(id);
    if (!existing) {
      throw new Error(`Request not found: ${id}`);
    }
    const optimistic: HelpRequest = {
      ...existing,
      status,
      updatedAt: nowIso(),
      syncStatus: 'pending',
    };
    await this.deps.local.save(optimistic);
    this.changes.emit();

    try {
      const remote = await this.deps.api.patchStatus(id, { status });
      const synced: HelpRequest = {
        ...optimistic,
        ...remote,
        id,
        syncStatus: 'synced',
      };
      await this.deps.local.save(synced);
      this.changes.emit();
      return synced;
    } catch {
      await this.deps.local.markSyncStatus(id, 'error');
      this.changes.emit();
      const errored = await this.deps.local.getById(id);
      return errored ?? { ...optimistic, syncStatus: 'error' };
    }
  }

  /** Apply a server-pushed update (e.g. from WebSocket). */
  async upsertFromRemote(remote: HelpRequest): Promise<void> {
    await this.deps.local.save({ ...remote, syncStatus: 'synced' });
    this.changes.emit();
  }
}
