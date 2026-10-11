// Aggregates the four repositories into a single bundle. Constructed
// once in RepositoryProvider; consumed by hooks.

import { ApiService } from '../api/types';
import { LocalDataSourceBundle } from '../local/types';
import { NotificationRepository } from './NotificationRepository';
import { RequestRepository } from './RequestRepository';
import { ResponseRepository } from './ResponseRepository';
import { UserRepository } from './UserRepository';

export class RepositoryBundle {
  requests: RequestRepository;
  users: UserRepository;
  responses: ResponseRepository;
  notifications: NotificationRepository;

  constructor(
    public local: LocalDataSourceBundle,
    public api: ApiService,
  ) {
    this.requests = new RequestRepository({
      local: local.requests,
      api,
    });
    this.users = new UserRepository(local.users, api);
    this.responses = new ResponseRepository(local.responses, api);
    this.notifications = new NotificationRepository(local.notifications, api);
  }
}
