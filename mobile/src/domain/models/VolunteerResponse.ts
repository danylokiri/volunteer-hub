// Represents a volunteer's reply to a HelpRequest. A user can leave
// multiple responses on different requests; for any single request a
// volunteer can have at most one response that is not 'withdrawn'
// (enforced by the requester's UI / server).
//
// declineReason is set by the server when status flips to 'declined' so
// the client can surface a human reason: "manually_declined" (creator
// dropped the response), "registration_closed" (creator closed
// registration), "capacity_filled" (limited slots all taken).
//
// syncStatus mirrors HelpRequest's offline-first lifecycle.

import { DeclineReason, ResponseStatus, SyncStatus } from '../enums';
import { generateId, nowIso } from '../idGenerator';

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

export type CreateVolunteerResponseInput = {
  id?: string;
  requestId: string;
  volunteerId: string;
  message: string;
  contact?: string;
  comment?: string;
  status?: ResponseStatus;
  declineReason?: DeclineReason;
  createdAt?: string;
  syncStatus?: SyncStatus;
};

export function createVolunteerResponse(
  input: CreateVolunteerResponseInput,
): VolunteerResponse {
  return {
    id: input.id ?? generateId(),
    requestId: input.requestId,
    volunteerId: input.volunteerId,
    message: input.message,
    contact: input.contact,
    comment: input.comment,
    status: input.status ?? 'pending',
    declineReason: input.declineReason,
    createdAt: input.createdAt ?? nowIso(),
    syncStatus: input.syncStatus ?? 'pending',
  };
}
