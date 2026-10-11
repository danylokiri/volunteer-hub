// The discriminated union of WebSocket events the server pushes to
// the mobile client. Validated against `isValidSocketEvent` before
// the manager hands the event to subscribers.

import { HelpRequest } from '../domain/models/HelpRequest';
import { NotificationEvent } from '../domain/models/NotificationEvent';
import { VolunteerResponse } from '../domain/models/VolunteerResponse';
import { RequestStatus, SOCKET_EVENT_TYPES } from '../domain/enums';

export type SocketEvent =
  | { type: 'request.created'; payload: HelpRequest }
  | { type: 'request.updated'; payload: HelpRequest }
  | {
      type: 'request.status_changed';
      payload: { id: string; status: RequestStatus };
    }
  | { type: 'response.created'; payload: VolunteerResponse }
  | { type: 'response.accepted'; payload: VolunteerResponse }
  | { type: 'notification.created'; payload: NotificationEvent };

export function isValidSocketEvent(value: unknown): value is SocketEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as { type?: unknown; payload?: unknown };
  if (typeof v.type !== 'string') return false;
  if (!SOCKET_EVENT_TYPES.includes(v.type as SocketEvent['type'])) return false;
  if (!v.payload || typeof v.payload !== 'object') return false;
  return true;
}
