import { createVolunteerResponse } from '../../domain/models/VolunteerResponse';

describe('createVolunteerResponse', () => {
  it('A3: defaults status="pending" and syncStatus="pending"', () => {
    const r = createVolunteerResponse({
      requestId: 'req-1',
      volunteerId: 'demo-user-id',
      message: 'Можу допомогти',
    });
    expect(r.id).toEqual(expect.any(String));
    expect(r.requestId).toBe('req-1');
    expect(r.volunteerId).toBe('demo-user-id');
    expect(r.message).toBe('Можу допомогти');
    expect(r.status).toBe('pending');
    expect(r.syncStatus).toBe('pending');
    expect(typeof r.createdAt).toBe('string');
  });

  it('A3b: respects explicit status / syncStatus', () => {
    const r = createVolunteerResponse({
      requestId: 'req-x',
      volunteerId: 'u',
      message: 'm',
      status: 'accepted',
      syncStatus: 'synced',
    });
    expect(r.status).toBe('accepted');
    expect(r.syncStatus).toBe('synced');
  });
});
