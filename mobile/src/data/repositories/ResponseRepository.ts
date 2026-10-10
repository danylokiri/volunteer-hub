// VolunteerResponse repository. Local-first create; same syncStatus
// transitions as RequestRepository.

import { ApiService } from '../api/types';
import { ApiError } from '../api/ApiError';
import { ResponseLocalDataSource } from '../local/types';
import { ChangeEmitter } from './BaseRepository';
import {
  CreateVolunteerResponseInput,
  createVolunteerResponse,
  VolunteerResponse,
} from '../../domain/models/VolunteerResponse';

export class ResponseRepository {
  changes = new ChangeEmitter();

  constructor(
    private local: ResponseLocalDataSource,
    private api: ApiService,
  ) {}

  async listByRequest(requestId: string): Promise<VolunteerResponse[]> {
    return this.local.listByRequest(requestId);
  }

  async create(
    input: CreateVolunteerResponseInput,
  ): Promise<VolunteerResponse> {
    const draft = createVolunteerResponse({ ...input, syncStatus: 'pending' });
    await this.local.save(draft);
    this.changes.emit();

    try {
      const remote = await this.api.createResponse(draft.requestId, {
        volunteerId: draft.volunteerId,
        message: draft.message,
      });
      const synced: VolunteerResponse = {
        ...draft,
        ...remote,
        id: draft.id,
        syncStatus: 'synced',
      };
      await this.local.save(synced);
      this.changes.emit();
      return synced;
    } catch (err) {
      void err; // captured intentionally
      await this.local.markSyncStatus(draft.id, 'error');
      this.changes.emit();
      const errored = await this.local.getById(draft.id);
      return errored ?? { ...draft, syncStatus: 'error' };
    }
  }

  async delete(id: string): Promise<void> {
    await this.local.delete(id);
    this.changes.emit();
  }

  async upsertFromRemote(remote: VolunteerResponse): Promise<void> {
    await this.local.save({ ...remote, syncStatus: 'synced' });
    this.changes.emit();
  }

  // Re-export ApiError type checker so callers can branch on errors
  // without importing the api error class directly.
  isApiError = (err: unknown): err is ApiError => err instanceof ApiError;
}
