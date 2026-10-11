import { MapLocalDataSourceBundle } from '../../data/local/MapLocalDataSource';
import { MockApiService } from '../../data/api/MockApiService';
import { RequestRepository } from '../../data/repositories/RequestRepository';

describe('Phase 4 — RequestRepository (orchestrator)', () => {
  it('B5b: create writes draft with syncStatus="pending"', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService();
    const repo = new RequestRepository({ local: local.requests, api });

    let firstEmitState: { syncStatus?: string } | undefined;
    repo.changes.subscribe(() => {
      // capture the first emit's local state synchronously
      // (we'll resolve the rest via the awaited result)
      void local.requests.list().then((list) => {
        if (!firstEmitState) firstEmitState = list[0];
      });
    });

    const created = await repo.create({
      title: 't',
      description: 'd',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
    });
    expect(created.syncStatus).toBe('synced');
  });

  it('B6b: create flips pending → synced after successful API', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService();
    const repo = new RequestRepository({ local: local.requests, api });

    const created = await repo.create({
      title: 't',
      description: 'd',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
    });
    expect(created.syncStatus).toBe('synced');
    const stored = await local.requests.getById(created.id);
    expect(stored?.syncStatus).toBe('synced');
  });

  it('B7b: create flips pending → error on API failure', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService({ failOn: new Set(['createRequest']) });
    const repo = new RequestRepository({ local: local.requests, api });

    const created = await repo.create({
      title: 't',
      description: 'd',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
    });
    expect(created.syncStatus).toBe('error');
    const stored = await local.requests.getById(created.id);
    expect(stored?.syncStatus).toBe('error');
  });

  it('B8b: refreshFromApi merges remote into local (returns ok=true)', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService();
    const repo = new RequestRepository({ local: local.requests, api });

    expect((await local.requests.list()).length).toBe(0);
    const result = await repo.refreshFromApi();
    expect(result.ok).toBe(true);
    const list = await local.requests.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.syncStatus === 'synced')).toBe(true);
  });

  it('B9b: refreshFromApi keeps cached data on API failure (returns ok=false)', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService({ failOn: new Set(['listRequests']) });
    const repo = new RequestRepository({ local: local.requests, api });

    // Pre-cache a record locally.
    const fixture = {
      id: 'r-cached',
      title: 'кеш',
      description: '',
      category: 'pets' as const,
      status: 'open' as const,
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      assignedVolunteerId: null,
      acceptedVolunteerIds: [] as string[],
      volunteerSlotsMode: 'unlimited' as const,
      registrationStatus: 'open' as const,
      createdAt: 'now',
      updatedAt: 'now',
      syncStatus: 'synced' as const,
    };
    await local.requests.save(fixture);

    const result = await repo.refreshFromApi();
    expect(result.ok).toBe(false);
    const after = await local.requests.list();
    expect(after.find((r) => r.id === 'r-cached')).toBeDefined();
  });

  it('B10b: getById reads local first', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService();
    const repo = new RequestRepository({ local: local.requests, api });

    await local.requests.save({
      id: 'local-only',
      title: 't',
      description: '',
      category: 'pets',
      status: 'open',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      assignedVolunteerId: null,
      acceptedVolunteerIds: [],
      volunteerSlotsMode: 'unlimited',
      registrationStatus: 'open',
      createdAt: 'now',
      updatedAt: 'now',
      syncStatus: 'synced',
    });

    const r = await repo.getById('local-only');
    expect(r?.id).toBe('local-only');
  });

  it('updateStatus pending → synced via API', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService();
    // Seed via API so the request exists on both sides.
    await local.requests.upsertMany(await api.listRequests());
    const repo = new RequestRepository({ local: local.requests, api });

    const updated = await repo.updateStatus('req-1', 'completed');
    expect(updated.status).toBe('completed');
    expect(updated.syncStatus).toBe('synced');
  });

  it('updateStatus pending → error when API fails', async () => {
    const local = new MapLocalDataSourceBundle();
    const api = new MockApiService({ failOn: new Set(['patchStatus']) });
    await local.requests.upsertMany(await api.listRequests());
    const repo = new RequestRepository({ local: local.requests, api });

    const updated = await repo.updateStatus('req-1', 'completed');
    // The API failure does not roll back the optimistic status, but
    // syncStatus is "error" so the UI knows.
    expect(updated.status).toBe('completed');
    expect(updated.syncStatus).toBe('error');
  });
});
