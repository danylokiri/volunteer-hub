// Represents a realtime notification surfaced to the user. Produced
// from incoming WebSocket events. The optional title/message fields
// store a pre-rendered human string (set by the mapper in
// domain/notifications/mapNotification.ts at append-time, so old
// records persisted before the mapper was introduced still get a
// human label when read back).

import { SocketEventType } from '../enums';
import { generateId, nowIso } from '../idGenerator';

export type NotificationEvent = {
  id: string;
  type: SocketEventType;
  payload: Record<string, unknown>;
  title?: string;
  message?: string;
  relatedRequestId?: string;
  createdAt: string;
  read: boolean;
};

export type CreateNotificationEventInput = {
  id?: string;
  type: SocketEventType;
  payload?: Record<string, unknown>;
  title?: string;
  message?: string;
  relatedRequestId?: string;
  createdAt?: string;
  read?: boolean;
};

export function createNotificationEvent(
  input: CreateNotificationEventInput,
): NotificationEvent {
  return {
    id: input.id ?? generateId(),
    type: input.type,
    payload: input.payload ?? {},
    title: input.title,
    message: input.message,
    relatedRequestId: input.relatedRequestId,
    createdAt: input.createdAt ?? nowIso(),
    read: input.read ?? false,
  };
}
