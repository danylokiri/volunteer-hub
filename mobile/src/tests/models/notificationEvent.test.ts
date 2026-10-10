import { createNotificationEvent } from '../../domain/models/NotificationEvent';

describe('createNotificationEvent', () => {
  it('A4: defaults read=false and produces a stable id', () => {
    const e = createNotificationEvent({ type: 'request.created' });
    expect(e.id).toEqual(expect.any(String));
    expect(e.id.length).toBeGreaterThan(0);
    expect(e.type).toBe('request.created');
    expect(e.payload).toEqual({});
    expect(typeof e.createdAt).toBe('string');
    expect(e.read).toBe(false);
  });

  it('A4b: keeps custom payload and respects explicit read=true', () => {
    const e = createNotificationEvent({
      type: 'response.accepted',
      payload: { requestId: 'r-1', volunteerId: 'u-1' },
      read: true,
      id: 'fixed',
    });
    expect(e.id).toBe('fixed');
    expect(e.payload).toEqual({ requestId: 'r-1', volunteerId: 'u-1' });
    expect(e.read).toBe(true);
  });
});
