// Pure mapper that turns a NotificationEvent (which carries a server
// event type + payload) into a human-readable {title, message} pair in
// Ukrainian. Used by NotificationsScreen for display and by the
// notification repository when appending realtime events from the
// socket — so old persisted records still render with proper text
// after a code update.

import { HelpRequest } from '../models/HelpRequest';
import { NotificationEvent } from '../models/NotificationEvent';
import { UserProfile } from '../models/UserProfile';
import { DeclineReason } from '../enums';

export type NotificationMapContext = {
  currentUserId?: string | null;
  getRequestById?: (id: string) => HelpRequest | undefined;
  getUserById?: (id: string) => UserProfile | undefined;
};

export type RenderedNotification = {
  title: string;
  message: string;
  relatedRequestId?: string;
};

const DECLINE_REASON_LABEL: Record<DeclineReason, string> = {
  manually_declined: 'автор відхилив відгук',
  registration_closed: 'реєстрацію закрито',
  capacity_filled: 'усі місця волонтерів заповнені',
};

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function requestTitle(
  ctx: NotificationMapContext,
  payload: Record<string, unknown>,
): string {
  const fromPayload = asString(payload?.title);
  if (fromPayload) return fromPayload;
  const id = asString(payload?.id) ?? asString(payload?.requestId);
  if (id && ctx.getRequestById) {
    return ctx.getRequestById(id)?.title ?? 'заявку';
  }
  return 'заявку';
}

function relatedRequestId(
  payload: Record<string, unknown>,
): string | undefined {
  return asString(payload?.id) ?? asString(payload?.requestId);
}

export function mapNotification(
  event: NotificationEvent,
  ctx: NotificationMapContext = {},
): RenderedNotification {
  // If the event already carries a title/message (server-side rendered
  // or saved by a prior version of the mapper), trust that.
  if (event.title || event.message) {
    return {
      title: event.title ?? '',
      message: event.message ?? '',
      relatedRequestId:
        event.relatedRequestId ?? relatedRequestId(event.payload),
    };
  }

  const payload = event.payload ?? {};
  const reqTitle = requestTitle(ctx, payload);
  const reqId = relatedRequestId(payload);

  switch (event.type) {
    case 'request.created': {
      const district = asString(payload.district) ?? 'у вашому районі';
      return {
        title: 'Нова заявка поруч',
        message: `${district} · ${reqTitle}`,
        relatedRequestId: reqId,
      };
    }
    case 'request.updated':
      return {
        title: 'Заявку оновлено',
        message: reqTitle,
        relatedRequestId: reqId,
      };
    case 'request.status_changed': {
      const status = asString(payload.status) ?? 'оновлено';
      return {
        title: 'Статус заявки змінено',
        message: `${reqTitle} · ${status}`,
        relatedRequestId: reqId,
      };
    }
    case 'request.registration_changed': {
      const reg = asString(payload.registrationStatus);
      return {
        title:
          reg === 'closed' ? 'Реєстрацію закрито' : 'Реєстрацію відкрито',
        message: reqTitle,
        relatedRequestId: reqId,
      };
    }
    case 'request.completion_requested':
      return {
        title: 'Волонтер позначив виконаним',
        message: `Підтвердіть виконання: ${reqTitle}`,
        relatedRequestId: reqId,
      };
    case 'request.completed':
      return {
        title: 'Заявку завершено',
        message: reqTitle,
        relatedRequestId: reqId,
      };
    case 'response.created': {
      const volunteerId = asString(payload.volunteerId);
      const volunteerName =
        (volunteerId && ctx.getUserById?.(volunteerId)?.fullName) ??
        'Волонтер';
      return {
        title: 'Новий відгук на вашу заявку',
        message: `${volunteerName} хоче допомогти`,
        relatedRequestId: asString(payload.requestId),
      };
    }
    case 'response.accepted':
      return {
        title: 'Ваш відгук прийнято',
        message: reqTitle,
        relatedRequestId: asString(payload.requestId),
      };
    case 'response.declined': {
      const reason = asString(payload.declineReason) as DeclineReason | undefined;
      const reasonText = reason
        ? DECLINE_REASON_LABEL[reason] ?? 'без вказаної причини'
        : 'без вказаної причини';
      return {
        title: 'Ваш відгук відхилено',
        message: `${reqTitle} · ${reasonText}`,
        relatedRequestId: asString(payload.requestId),
      };
    }
    case 'notification.created':
      return {
        title: asString(payload.title) ?? 'Сповіщення',
        message: asString(payload.message) ?? '',
        relatedRequestId: asString(payload.relatedRequestId),
      };
    default:
      return {
        title: 'Сповіщення',
        message: '',
        relatedRequestId: reqId,
      };
  }
}
