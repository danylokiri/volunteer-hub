import {
  createEmptyMapStore,
  MapLocalDataSourceBundle,
  MapLocalStore,
} from '../../data/local/MapLocalDataSource';
import { createHelpRequest } from '../../domain/models/HelpRequest';
import { createUserProfile } from '../../domain/models/UserProfile';
import { createVolunteerResponse } from '../../domain/models/VolunteerResponse';

function makeRequest(id: string, overrides: Partial<{ status: any }> = {}) {
  return createHelpRequest({
    id,
    title: `Запит ${id}`,
    description: 'опис',
    category: 'pets',
    latitude: 50,
    longitude: 30,
    createdByUserId: 'demo-user-id',
    syncStatus: 'pending',
    status: overrides.status,
  });
}

describe('Phase 3 — LocalDataSource (Map-backed)', () => {
  it('B5: requests.save persists with syncStatus=pending', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.initialize();
    const r = makeRequest('r1');
    await bundle.requests.save(r);
    const fromStore = await bundle.requests.getById('r1');
    expect(fromStore).toBeDefined();
    expect(fromStore!.syncStatus).toBe('pending');
  });

  it('B6: markSyncStatus flips pending → synced', async () => {
    const bundle = new MapLocalDataSourceBundle();
    const r = makeRequest('r1');
    await bundle.requests.save(r);
    await bundle.requests.markSyncStatus('r1', 'synced');
    const after = await bundle.requests.getById('r1');
    expect(after!.syncStatus).toBe('synced');
  });

  it('B7: markSyncStatus flips pending → error', async () => {
    const bundle = new MapLocalDataSourceBundle();
    const r = makeRequest('r1');
    await bundle.requests.save(r);
    await bundle.requests.markSyncStatus('r1', 'error');
    const after = await bundle.requests.getById('r1');
    expect(after!.syncStatus).toBe('error');
  });

  it('B8: list returns all requests sorted by createdAt desc', async () => {
    const bundle = new MapLocalDataSourceBundle();
    const r1 = createHelpRequest({
      id: 'r1',
      title: 'a',
      description: '',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
    const r2 = createHelpRequest({
      id: 'r2',
      title: 'b',
      description: '',
      category: 'pets',
      latitude: 0,
      longitude: 0,
      createdByUserId: 'u',
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    });
    await bundle.requests.save(r1);
    await bundle.requests.save(r2);
    const list = await bundle.requests.list();
    expect(list.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('B9: list filters by status', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.requests.save(makeRequest('open-1', { status: 'open' }));
    await bundle.requests.save(
      makeRequest('done-1', { status: 'completed' }),
    );
    const onlyOpen = await bundle.requests.list({ status: 'open' });
    expect(onlyOpen.map((r) => r.id)).toEqual(['open-1']);
  });

  it('B10: getById returns the saved record', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.requests.save(makeRequest('r1'));
    const r = await bundle.requests.getById('r1');
    expect(r?.id).toBe('r1');
    const missing = await bundle.requests.getById('does-not-exist');
    expect(missing).toBeUndefined();
  });

  it('B11: delete removes the record', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.requests.save(makeRequest('r1'));
    await bundle.requests.delete('r1');
    expect(await bundle.requests.getById('r1')).toBeUndefined();
    expect(await bundle.requests.list()).toEqual([]);
  });

  it('B12: data persists across simulated restart (new bundle, same store)', async () => {
    const store: MapLocalStore = createEmptyMapStore();
    const first = new MapLocalDataSourceBundle(store);
    await first.requests.save(makeRequest('r1'));
    await first.users.save(createUserProfile({ id: 'u1', fullName: 'Test' }));
    await first.responses.save(
      createVolunteerResponse({
        id: 'res-1',
        requestId: 'r1',
        volunteerId: 'u1',
        message: 'hi',
      }),
    );

    // "App is closed". Drop reference, create a new bundle pointing
    // at the same backing store -- the persistence contract.
    const reopened = new MapLocalDataSourceBundle(store);
    expect((await reopened.requests.getById('r1'))?.id).toBe('r1');
    expect((await reopened.users.getById('u1'))?.fullName).toBe('Test');
    expect((await reopened.responses.listByRequest('r1')).length).toBe(1);
  });

  it('B13: users.save round-trips all fields', async () => {
    const bundle = new MapLocalDataSourceBundle();
    const u = createUserProfile({
      id: 'u-rt',
      fullName: 'Олена',
      rating: 4.7,
      completedRequests: 10,
      isVerified: true,
      createdAt: '2025-09-01T10:00:00Z',
      avatarUrl: 'https://x/y.png',
    });
    await bundle.users.save(u);
    const loaded = await bundle.users.getById('u-rt');
    expect(loaded).toEqual(u);
  });

  it('B14: responses.listByRequest filters correctly', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.responses.save(
      createVolunteerResponse({
        id: 'a',
        requestId: 'r1',
        volunteerId: 'u',
        message: 'm',
      }),
    );
    await bundle.responses.save(
      createVolunteerResponse({
        id: 'b',
        requestId: 'r2',
        volunteerId: 'u',
        message: 'm',
      }),
    );
    await bundle.responses.save(
      createVolunteerResponse({
        id: 'c',
        requestId: 'r1',
        volunteerId: 'u2',
        message: 'm',
      }),
    );
    const r1 = await bundle.responses.listByRequest('r1');
    expect(r1.map((r) => r.id).sort()).toEqual(['a', 'c']);
    const r3 = await bundle.responses.listByRequest('r3');
    expect(r3).toEqual([]);
  });

  it('B14b: notifications list/markRead/delete', async () => {
    const bundle = new MapLocalDataSourceBundle();
    await bundle.notifications.save({
      id: 'n1',
      type: 'request.created',
      payload: {},
      createdAt: '2025-01-01',
      read: false,
    });
    await bundle.notifications.save({
      id: 'n2',
      type: 'response.created',
      payload: {},
      createdAt: '2025-01-02',
      read: true,
    });
    const unread = await bundle.notifications.list({ read: false });
    expect(unread.map((n) => n.id)).toEqual(['n1']);
    await bundle.notifications.markRead('n1');
    const stillUnread = await bundle.notifications.list({ read: false });
    expect(stillUnread).toEqual([]);
    await bundle.notifications.delete('n1');
    expect(await bundle.notifications.getById('n1')).toBeUndefined();
  });
});
