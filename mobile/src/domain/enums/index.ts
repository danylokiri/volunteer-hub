// Centralized string-literal unions used across models, navigation,
// realtime, and security modules.

export type RequestStatus =
  | 'open'
  | 'in_progress'
  | 'completion_requested'
  | 'completed'
  | 'cancelled';

export type ResponseStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn';

export type DeclineReason =
  | 'manually_declined'
  | 'registration_closed'
  | 'capacity_filled';

export type SyncStatus = 'pending' | 'synced' | 'error';

export type SocketConnectionState =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reconnecting';

export type BiometricAuthState =
  | 'Idle'
  | 'Authenticating'
  | 'Success'
  | 'Failed'
  | 'Unavailable';

export type HelpCategory =
  | 'pets'
  | 'shopping'
  | 'transport'
  | 'medical'
  | 'tutoring'
  | 'other';

export type SocketEventType =
  | 'request.created'
  | 'request.updated'
  | 'request.status_changed'
  | 'request.registration_changed'
  | 'request.completion_requested'
  | 'request.completed'
  | 'response.created'
  | 'response.accepted'
  | 'response.declined'
  | 'notification.created';

export type UserRole = 'requester' | 'volunteer' | 'admin';

export type VolunteerSlotsMode = 'limited' | 'unlimited';

export type RegistrationStatus = 'open' | 'closed';

export const REQUEST_STATUSES: RequestStatus[] = [
  'open',
  'in_progress',
  'completion_requested',
  'completed',
  'cancelled',
];

export const RESPONSE_STATUSES: ResponseStatus[] = [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
];

export const HELP_CATEGORIES: HelpCategory[] = [
  'pets',
  'shopping',
  'transport',
  'medical',
  'tutoring',
  'other',
];

export const SOCKET_EVENT_TYPES: SocketEventType[] = [
  'request.created',
  'request.updated',
  'request.status_changed',
  'request.registration_changed',
  'request.completion_requested',
  'request.completed',
  'response.created',
  'response.accepted',
  'response.declined',
  'notification.created',
];

export const USER_ROLES: UserRole[] = ['requester', 'volunteer', 'admin'];

export const VOLUNTEER_SLOTS_MODES: VolunteerSlotsMode[] = [
  'limited',
  'unlimited',
];

export const REGISTRATION_STATUSES: RegistrationStatus[] = ['open', 'closed'];

export const DECLINE_REASONS: DeclineReason[] = [
  'manually_declined',
  'registration_closed',
  'capacity_filled',
];
