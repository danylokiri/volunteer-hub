// User repository: cache + server-refresh on demand. The course build
// only really needs `getCurrent` (the demo user); other users are
// referenced by id from HelpRequest / VolunteerResponse.

import { ApiService } from '../api/types';
import { UserLocalDataSource } from '../local/types';
import { ChangeEmitter } from './BaseRepository';
import { UserProfile } from '../../domain/models/UserProfile';

export class UserRepository {
  changes = new ChangeEmitter();

  constructor(
    private local: UserLocalDataSource,
    private api: ApiService,
  ) {}

  async getById(id: string): Promise<UserProfile | undefined> {
    return this.local.getById(id);
  }

  async list(): Promise<UserProfile[]> {
    return this.local.list();
  }

  async refreshFromApi(id: string): Promise<{ ok: boolean }> {
    try {
      const remote = await this.api.getUser(id);
      await this.local.save(remote);
      this.changes.emit();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async upsertFromRemote(user: UserProfile): Promise<void> {
    await this.local.save(user);
    this.changes.emit();
  }
}
