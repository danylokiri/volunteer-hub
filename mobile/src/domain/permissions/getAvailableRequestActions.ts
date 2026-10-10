// Pure decision table that turns (currentUser, request, responses) into
// a sorted list of actions that the UI may render. RequestDetailScreen
// reads this and gates buttons accordingly. Tests cover the matrix
// directly — no React, no storage.

import { HelpRequest } from '../models/HelpRequest';
import { UserProfile } from '../models/UserProfile';
import { VolunteerResponse } from '../models/VolunteerResponse';

export type RequestAction =
  | 'respond'
  | 'withdraw_response'
  | 'view_status'
  | 'edit'
  | 'cancel_request'
  | 'view_responses'
  | 'accept_response'
  | 'decline_response'
  | 'close_registration'
  | 'reopen_registration'
  | 'mark_completed'
  | 'confirm_completion'
  | 'admin_delete'
  | 'admin_cancel';

export type ActionContext = {
  isCreator: boolean;
  isAdmin: boolean;
  isAcceptedVolunteer: boolean;
  hasPendingResponse: boolean;
  ownPendingResponseId?: string;
  registrationOpen: boolean;
  capacityFull: boolean;
  hasCompletionRequested: boolean;
};

function deriveContext(
  user: UserProfile | null | undefined,
  request: HelpRequest,
  responses: VolunteerResponse[],
): ActionContext {
  const accepted = request.acceptedVolunteerIds ?? [];
  const slotsMode = request.volunteerSlotsMode ?? 'unlimited';
  const slots = request.volunteerSlots;
  const capacityFull =
    slotsMode === 'limited' && typeof slots === 'number' && accepted.length >= slots;
  const registrationOpen = (request.registrationStatus ?? 'open') === 'open';

  const ownResponses = responses.filter((r) => r.volunteerId === user?.id);
  const ownPending = ownResponses.find((r) => r.status === 'pending');

  const hasCompletionRequested = request.status === 'completion_requested';

  return {
    isCreator: !!user && user.id === request.createdByUserId,
    isAdmin: !!user && user.roles.includes('admin'),
    isAcceptedVolunteer: !!user && accepted.includes(user.id),
    hasPendingResponse: !!ownPending,
    ownPendingResponseId: ownPending?.id,
    registrationOpen,
    capacityFull,
    hasCompletionRequested,
  };
}

export function getAvailableRequestActions(
  user: UserProfile | null | undefined,
  request: HelpRequest,
  responses: VolunteerResponse[],
): RequestAction[] {
  const ctx = deriveContext(user, request, responses);
  const actions = new Set<RequestAction>();
  const status = request.status;

  // Read-only states close everything except admin moderation.
  const isTerminal = status === 'completed' || status === 'cancelled';

  // Creator
  if (ctx.isCreator) {
    actions.add('view_responses');
    if (!isTerminal) {
      actions.add('cancel_request');
      if (status === 'open' || status === 'in_progress') {
        if (ctx.registrationOpen && !ctx.capacityFull) {
          actions.add('accept_response');
        }
        actions.add('decline_response');
        if (ctx.registrationOpen) actions.add('close_registration');
        else actions.add('reopen_registration');
      }
      if (status === 'open') actions.add('edit');
      if (ctx.hasCompletionRequested) actions.add('confirm_completion');
    }
  }

  // Volunteer (could overlap with creator only in degenerate test data;
  // the action gate below filters out self-respond for the creator).
  if (!ctx.isCreator && !isTerminal && user) {
    if (ctx.isAcceptedVolunteer) {
      actions.add('view_status');
      if (status === 'in_progress') {
        actions.add('mark_completed');
      }
    } else if (ctx.hasPendingResponse) {
      actions.add('view_status');
      actions.add('withdraw_response');
    } else if (
      status === 'open' &&
      ctx.registrationOpen &&
      !ctx.capacityFull
    ) {
      actions.add('respond');
    }
  }

  // Admin layer is additive on top of any role-based actions.
  if (ctx.isAdmin) {
    actions.add('admin_delete');
    if (!isTerminal) actions.add('admin_cancel');
  }

  return Array.from(actions);
}
