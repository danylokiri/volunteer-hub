// Notification repository: cache + realtime push from WebSocket.
// Initial fetch from API on app start; thereafter the WebSocket is the
// source of truth.

import { ApiService } from '../api/types';
import { NotificationLocalDataSource } from '../local/types';
import { ChangeEmitter } from './BaseRepository';
import {
  createNotificationEvent,
  CreateNotificationEventInput,
  NotificationEvent,
} from '../../domain/models/NotificationEvent';

export class NotificationRepository {
  changes = new ChangeEmitter();

  constructor(
    private local: NotificationLocalDataSource,
    private api: ApiService,
  ) {}

  async list(): Promise<NotificationEvent[]> {
    return this.local.list();
  }

  async refreshFromApi(userId: string): Promise<{ ok: boolean }> {
    try {
      const remote = await this.api.listNotifications(userId);
      for (const n of remote) await this.local.save(n);
      this.changes.emit();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async create(input: CreateNotificationEventInput): Promise<NotificationEvent> {
    const event = createNotificationEvent(input);
    await this.local.save(event);
    this.changes.emit();
    return event;
  }

  async markRead(id: string): Promise<void> {
    await this.local.markRead(id);
    this.changes.emit();
  }

  async appendFromSocket(event: NotificationEvent): Promise<void> {
    await this.local.save(event);
    this.changes.emit();
  }
}
