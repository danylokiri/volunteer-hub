import { createHelpRequest } from '../../domain/models/HelpRequest';
import { createUserProfile } from '../../domain/models/UserProfile';
import { createVolunteerResponse } from '../../domain/models/VolunteerResponse';
import {
  getAvailableRequestActions,
  RequestAction,
} from '../../domain/permissions/getAvailableRequestActions';

const baseRequest = (overrides: Partial<Parameters<typeof createHelpRequest>[0]> = {}) =>
  createHelpRequest({
    id: 'req',
    title: 'T',
    description: '',
    category: 'pets',
    latitude: 50.45,
    longitude: 30.52,
    createdByUserId: 'creator-id',
    syncStatus: 'synced',
    ...overrides,
  });

const baseUser = (
  id: string,
  overrides: Partial<Parameters<typeof createUserProfile>[0]> = {},
) => createUserProfile({ id, fullName: id, ...overrides });

const baseResponse = (
  overrides: Partial<Parameters<typeof createVolunteerResponse>[0]> = {},
) =>
  createVolunteerResponse({
    requestId: 'req',
    volunteerId: 'volunteer-id',
    message: 'm',
    syncStatus: 'synced',
    ...overrides,
  });

function actionsFor(
  user: ReturnType<typeof baseUser> | null,
  request: ReturnType<typeof baseRequest>,
  responses: ReturnType<typeof baseResponse>[] = [],
): RequestAction[] {
  return getAvailableRequestActions(user, request, responses).sort();
}

describe('getAvailableRequestActions', () => {
  it('PA1: anonymous user sees nothing on an open request', () => {
    expect(actionsFor(null, baseRequest())).toEqual([]);
  });

  it('PA2: creator (open) gets create-side actions, no respond', () => {
    const creator = baseUser('creator-id');
    const acts = actionsFor(creator, baseRequest());
    expect(acts).toContain('cancel_request');
    expect(acts).toContain('view_responses');
    expect(acts).toContain('accept_response');
    expect(acts).toContain('close_registration');
    expect(acts).toContain('edit');
    expect(acts).not.toContain('respond');
    expect(acts).not.toContain('mark_completed');
  });

  it('PA3: creator (open, registration closed) sees reopen but not accept', () => {
    const creator = baseUser('creator-id');
    const req = baseRequest({ registrationStatus: 'closed' });
    const acts = actionsFor(creator, req);
    expect(acts).toContain('reopen_registration');
    expect(acts).not.toContain('accept_response');
    expect(acts).not.toContain('close_registration');
  });

  it('PA4: stranger volunteer (open) sees respond', () => {
    const stranger = baseUser('volunteer-id');
    expect(actionsFor(stranger, baseRequest())).toEqual(['respond']);
  });

  it('PA5: volunteer with pending response sees withdraw + view_status', () => {
    const stranger = baseUser('volunteer-id');
    const responses = [baseResponse({ status: 'pending' })];
    const acts = actionsFor(stranger, baseRequest(), responses);
    expect(acts).toEqual(['view_status', 'withdraw_response']);
  });

  it('PA6: accepted volunteer in_progress sees mark_completed', () => {
    const accepted = baseUser('volunteer-id');
    const req = baseRequest({
      status: 'in_progress',
      acceptedVolunteerIds: ['volunteer-id'],
      assignedVolunteerId: 'volunteer-id',
    });
    const acts = actionsFor(accepted, req);
    expect(acts).toContain('mark_completed');
    expect(acts).toContain('view_status');
    expect(acts).not.toContain('respond');
  });

  it('PA7: capacity full hides respond for new volunteers', () => {
    const stranger = baseUser('new-volunteer');
    const req = baseRequest({
      volunteerSlotsMode: 'limited',
      volunteerSlots: 1,
      acceptedVolunteerIds: ['volunteer-id'],
      registrationStatus: 'closed',
    });
    expect(actionsFor(stranger, req)).toEqual([]);
  });

  it('PA8: capacity full hides accept_response for creator', () => {
    const creator = baseUser('creator-id');
    const req = baseRequest({
      volunteerSlotsMode: 'limited',
      volunteerSlots: 1,
      acceptedVolunteerIds: ['volunteer-id'],
      registrationStatus: 'closed',
    });
    const acts = actionsFor(creator, req);
    expect(acts).not.toContain('accept_response');
    expect(acts).toContain('reopen_registration');
  });

  it('PA9: completion_requested gives confirm_completion to creator', () => {
    const creator = baseUser('creator-id');
    const req = baseRequest({
      status: 'completion_requested',
      acceptedVolunteerIds: ['volunteer-id'],
    });
    const acts = actionsFor(creator, req);
    expect(acts).toContain('confirm_completion');
  });

  it('PA10: completed/cancelled is read-only for non-admin users', () => {
    const creator = baseUser('creator-id');
    expect(actionsFor(creator, baseRequest({ status: 'completed' }))).toEqual([
      'view_responses',
    ]);
    const stranger = baseUser('volunteer-id');
    expect(actionsFor(stranger, baseRequest({ status: 'cancelled' }))).toEqual(
      [],
    );
  });

  it('PA11: admin sees moderation in addition to whatever role gives them', () => {
    const admin = baseUser('admin-id', {
      roles: ['requester', 'volunteer', 'admin'],
    });
    const acts = actionsFor(admin, baseRequest());
    expect(acts).toContain('admin_delete');
    expect(acts).toContain('admin_cancel');
    // admin (not the creator) on an open request can also respond
    expect(acts).toContain('respond');
  });

  it('PA12: admin on a completed request can still admin_delete', () => {
    const admin = baseUser('admin-id', {
      roles: ['requester', 'volunteer', 'admin'],
    });
    const acts = actionsFor(admin, baseRequest({ status: 'completed' }));
    expect(acts).toEqual(['admin_delete']);
  });
});
