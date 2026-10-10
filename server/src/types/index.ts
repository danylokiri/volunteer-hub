// Shared types used by the server. Keep these in sync with the mobile
// types under mobile/src/domain/models. Intentionally not imported from
// the mobile package (different tsconfig, different runtime); divergence
// is caught at test time.

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

export type HelpCategory =
  | 'pets'
  | 'shopping'
  | 'transport'
  | 'medical'
  | 'tutoring'
  | 'other';

export type UserRole = 'requester' | 'volunteer' | 'admin';

export type VolunteerSlotsMode = 'limited' | 'unlimited';

export type RegistrationStatus = 'open' | 'closed';

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

export type UserProfile = {
  id: string;
  fullName: string;
  rating: number;
  completedRequests: number;
  isVerified: boolean;
  createdAt: string;
  avatarUrl?: string;
  roles?: UserRole[];
  email?: string;
};

export type AuthRecord = {
  userId: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

export type HumanLocation = {
  city?: string;
  district?: string;
  address?: string;
  locationTitle?: string;
};

export type HelpRequest = {
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  status: RequestStatus;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  address?: string;
  locationTitle?: string;
  createdByUserId: string;
  assignedVolunteerId?: string | null;
  acceptedVolunteerIds?: string[];
  volunteerSlotsMode?: VolunteerSlotsMode;
  volunteerSlots?: number;
  registrationStatus?: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type VolunteerResponse = {
  id: string;
  requestId: string;
  volunteerId: string;
  message: string;
  contact?: string;
  comment?: string;
  status: ResponseStatus;
  declineReason?: DeclineReason;
  createdAt: string;
  syncStatus: SyncStatus;
};

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

export type Database = {
  users: UserProfile[];
  requests: HelpRequest[];
  responses: VolunteerResponse[];
  notifications: NotificationEvent[];
  auths?: AuthRecord[];
};

export type SocketBroadcast =
  | { type: 'request.created'; payload: HelpRequest }
  | { type: 'request.updated'; payload: HelpRequest }
  | {
      type: 'request.status_changed';
      payload: { id: string; status: RequestStatus };
    }
  | {
      type: 'request.registration_changed';
      payload: { id: string; registrationStatus: RegistrationStatus };
    }
  | {
      type: 'request.completion_requested';
      payload: { id: string; requestedByVolunteerId: string };
    }
  | { type: 'request.completed'; payload: HelpRequest }
  | { type: 'response.created'; payload: VolunteerResponse }
  | { type: 'response.accepted'; payload: VolunteerResponse }
  | { type: 'response.declined'; payload: VolunteerResponse }
  | { type: 'notification.created'; payload: NotificationEvent };
