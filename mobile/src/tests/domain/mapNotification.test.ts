import { createNotificationEvent } from '../../domain/models/NotificationEvent';
import { createUserProfile } from '../../domain/models/UserProfile';
import { createHelpRequest } from '../../domain/models/HelpRequest';
import { mapNotification } from '../../domain/notifications/mapNotification';

describe('mapNotification', () => {
  const ctx = {
    currentUserId: 'me',
    getUserById: (id: string) =>
      id === 'volunteer-1'
        ? createUserProfile({ id: 'volunteer-1', fullName: 'Олена П.' })
        : undefined,
    getRequestById: (id: string) =>
      id === 'req-1'
        ? createHelpRequest({
            id: 'req-1',
            title: 'Вигуляти собаку',
            description: '',
            category: 'pets',
            latitude: 50,
            longitude: 30,
            createdByUserId: 'creator',
          })
        : undefined,
  };

  it('MN1: pre-rendered title/message bypasses live mapping', () => {
    const e = createNotificationEvent({
      type: 'response.created',
      title: 'Заздалегідь',
      message: 'OK',
    });
    expect(mapNotification(e, ctx).title).toBe('Заздалегідь');
  });

  it('MN2: response.created uses volunteer name', () => {
    const e = createNotificationEvent({
      type: 'response.created',
      payload: { requestId: 'req-1', volunteerId: 'volunteer-1' },
    });
    const r = mapNotification(e, ctx);
    expect(r.title).toBe('Новий відгук на вашу заявку');
    expect(r.message).toBe('Олена П. хоче допомогти');
    expect(r.relatedRequestId).toBe('req-1');
  });

  it('MN3: response.declined surfaces the decline reason', () => {
    const e = createNotificationEvent({
      type: 'response.declined',
      payload: {
        requestId: 'req-1',
        declineReason: 'capacity_filled',
      },
    });
    const r = mapNotification(e, ctx);
    expect(r.title).toBe('Ваш відгук відхилено');
    expect(r.message).toContain('усі місця волонтерів заповнені');
    expect(r.relatedRequestId).toBe('req-1');
  });

  it('MN4: request.completion_requested asks the creator to confirm', () => {
    const e = createNotificationEvent({
      type: 'request.completion_requested',
      payload: { id: 'req-1', requestedByVolunteerId: 'volunteer-1' },
    });
    const r = mapNotification(e, ctx);
    expect(r.title).toBe('Волонтер позначив виконаним');
    expect(r.message).toContain('Підтвердіть виконання');
    expect(r.message).toContain('Вигуляти собаку');
    expect(r.relatedRequestId).toBe('req-1');
  });

  it('MN5: request.registration_changed renders open vs closed', () => {
    const closed = createNotificationEvent({
      type: 'request.registration_changed',
      payload: { id: 'req-1', registrationStatus: 'closed' },
    });
    const open = createNotificationEvent({
      type: 'request.registration_changed',
      payload: { id: 'req-1', registrationStatus: 'open' },
    });
    expect(mapNotification(closed, ctx).title).toBe('Реєстрацію закрито');
    expect(mapNotification(open, ctx).title).toBe('Реєстрацію відкрито');
  });

  it('MN6: request.created renders district + title', () => {
    const e = createNotificationEvent({
      type: 'request.created',
      payload: { id: 'req-1', district: 'Поділ' },
    });
    const r = mapNotification(e, ctx);
    expect(r.title).toBe('Нова заявка поруч');
    expect(r.message).toBe('Поділ · Вигуляти собаку');
  });

  it('MN7: notification.created falls back to payload title/message', () => {
    const e = createNotificationEvent({
      type: 'notification.created',
      payload: { title: 'Hi', message: 'There' },
    });
    expect(mapNotification(e, ctx).title).toBe('Hi');
    expect(mapNotification(e, ctx).message).toBe('There');
  });
});
