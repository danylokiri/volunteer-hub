// In-memory ApiService used by tests and as a development-time
// substitute when the backend-lite server is not running.
//
// Phase-12 update: implements capacity-aware accept/decline/withdraw and
// the auth pair so unit tests can drive the full flow without a real
// server.

import { ApiError } from './ApiError';
import {
  AcceptResponseResult,
  ApiService,
  AuthLoginResult,
  CreateRequestBody,
  CreateResponseBody,
  ListRequestsParams,
  LoginBody,
  PatchRegistrationBody,
  PatchStatusBody,
  RegisterUserBody,
  RegistrationChangeResult,
} from './types';
import {
  CreateHelpRequestInput,
  createHelpRequest,
  HelpRequest,
} from '../../domain/models/HelpRequest';
import {
  createNotificationEvent,
  NotificationEvent,
} from '../../domain/models/NotificationEvent';
import { createUserProfile, UserProfile } from '../../domain/models/UserProfile';
import {
  createVolunteerResponse,
  VolunteerResponse,
} from '../../domain/models/VolunteerResponse';
import {
  buildSeedNotifications,
  buildSeedRequests,
  buildSeedResponses,
  buildSeedUsers,
} from '../../domain/seed/mockData';
import { filterNearbyRequests } from '../../domain/geo/distance';
import { nowIso } from '../../domain/idGenerator';

export type MockApiOptions = {
  delayMs?: number;
  failOn?: Set<string>;
};

type MockAuthRecord = {
  userId: string;
  email: string;
  password: string;
};

export class MockApiService implements ApiService {
  private requests: HelpRequest[];
  private users: UserProfile[];
  private responses: VolunteerResponse[];
  private notifications: NotificationEvent[];
  private auths: MockAuthRecord[];

  constructor(private options: MockApiOptions = {}) {
    this.requests = buildSeedRequests();
    this.users = buildSeedUsers();
    this.responses = buildSeedResponses();
    this.notifications = buildSeedNotifications();
    // Default seeded passwords mirror server/src/seed/seed.ts so that
    // the demo flow works whether the app talks to MockApiService or the
    // real backend.
    const seededPasswords: Record<string, string> = {
      'demo-user-id': 'demo1234',
      'olena-id': 'olena1234',
      'mykola-id': 'mykola1234',
      'admin-user-id': 'admin1234',
      'requester-account-id': 'requester1234',
      'volunteer-account-id': 'volunteer1234',
    };
    this.auths = this.users.map((u) => ({
      userId: u.id,
      email: u.email ?? `${u.id}@volunteerhub.local`,
      password: seededPasswords[u.id] ?? 'demo1234',
    }));
  }

  private async maybeFail(label: string): Promise<void> {
    if (this.options.delayMs) {
      await new Promise((r) => setTimeout(r, this.options.delayMs));
    }
    if (this.options.failOn?.has(label)) {
      throw new ApiError('MOCK_FAIL', `Mock failure on ${label}`, 500);
    }
  }

  private replaceRequest(updated: HelpRequest): void {
    const idx = this.requests.findIndex((r) => r.id === updated.id);
    if (idx === -1) {
      this.requests = [updated, ...this.requests];
    } else {
      this.requests = [
        ...this.requests.slice(0, idx),
        updated,
        ...this.requests.slice(idx + 1),
      ];
    }
  }

  private replaceResponse(updated: VolunteerResponse): void {
    const idx = this.responses.findIndex((r) => r.id === updated.id);
    if (idx === -1) {
      this.responses = [updated, ...this.responses];
    } else {
      this.responses = [
        ...this.responses.slice(0, idx),
        updated,
        ...this.responses.slice(idx + 1),
      ];
    }
  }

  async health() {
    await this.maybeFail('health');
    return { ok: true as const, ts: nowIso() };
  }

  async listRequests(params?: ListRequestsParams) {
    await this.maybeFail('listRequests');
    let result = this.requests;
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    if (params?.category) {
      result = result.filter((r) => r.category === params.category);
    }
    if (
      typeof params?.lat === 'number' &&
      typeof params?.lng === 'number' &&
      typeof params?.radius === 'number'
    ) {
      result = filterNearbyRequests(
        result,
        { latitude: params.lat, longitude: params.lng },
        params.radius,
      );
    }
    return result.map((r) => ({ ...r }));
  }

  async getRequest(id: string) {
    await this.maybeFail('getRequest');
    const r = this.requests.find((x) => x.id === id);
    if (!r) throw new ApiError('NOT_FOUND', 'Request not found', 404);
    return { ...r };
  }

  async createRequest(body: CreateRequestBody) {
    await this.maybeFail('createRequest');
    if (!body.title || !body.description) {
      throw new ApiError('VALIDATION', 'title and description are required', 400);
    }
    if (body.volunteerSlotsMode === 'limited') {
      if (!body.volunteerSlots || body.volunteerSlots < 1) {
        throw new ApiError(
          'VALIDATION',
          'volunteerSlots must be >=1 when mode is limited',
          400,
        );
      }
    }
    const draft: CreateHelpRequestInput = {
      ...body,
      category: body.category as any,
      syncStatus: 'synced',
      status: 'open',
    };
    const created = createHelpRequest(draft);
    this.requests = [created, ...this.requests];
    return { ...created };
  }

  async createResponse(requestId: string, body: CreateResponseBody) {
    await this.maybeFail('createResponse');
    if (!body.message) {
      throw new ApiError('VALIDATION', 'message is required', 400);
    }
    const target = this.requests.find((r) => r.id === requestId);
    if (!target) {
      throw new ApiError('NOT_FOUND', 'Request not found', 404);
    }
    if ((target.registrationStatus ?? 'open') !== 'open') {
      throw new ApiError(
        'REGISTRATION_CLOSED',
        'Volunteer registration is closed',
        409,
      );
    }
    const created = createVolunteerResponse({
      requestId,
      volunteerId: body.volunteerId,
      message: body.message,
      contact: body.contact,
      comment: body.comment,
      status: 'pending',
      syncStatus: 'synced',
    });
    this.responses = [created, ...this.responses];
    return { ...created };
  }

  async acceptResponse(
    requestId: string,
    responseId: string,
  ): Promise<AcceptResponseResult> {
    await this.maybeFail('acceptResponse');
    const target = this.responses.find(
      (r) => r.id === responseId && r.requestId === requestId,
    );
    if (!target) {
      throw new ApiError('NOT_FOUND', 'Response not found', 404);
    }
    if (target.status !== 'pending') {
      throw new ApiError(
        'INVALID_STATE',
        `Response is already ${target.status}`,
        409,
      );
    }
    const requestRow = this.requests.find((r) => r.id === requestId);
    if (!requestRow) {
      throw new ApiError('NOT_FOUND', 'Request not found', 404);
    }
    const accepted: VolunteerResponse = {
      ...target,
      status: 'accepted',
      syncStatus: 'synced',
    };
    this.replaceResponse(accepted);
    const acceptedIds = Array.from(
      new Set([
        ...(requestRow.acceptedVolunteerIds ?? []),
        target.volunteerId,
      ]),
    );
    let updatedRequest: HelpRequest = {
      ...requestRow,
      acceptedVolunteerIds: acceptedIds,
      assignedVolunteerId:
        requestRow.assignedVolunteerId ?? acceptedIds[0] ?? null,
      status:
        requestRow.status === 'open' ? 'in_progress' : requestRow.status,
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    if (
      updatedRequest.volunteerSlotsMode === 'limited' &&
      typeof updatedRequest.volunteerSlots === 'number' &&
      acceptedIds.length >= updatedRequest.volunteerSlots
    ) {
      updatedRequest = { ...updatedRequest, registrationStatus: 'closed' };
      // Auto-decline siblings
      for (const sibling of this.responses) {
        if (
          sibling.requestId === requestId &&
          sibling.id !== accepted.id &&
          sibling.status === 'pending'
        ) {
          this.replaceResponse({
            ...sibling,
            status: 'declined',
            declineReason: 'capacity_filled',
            syncStatus: 'synced',
          });
        }
      }
    }
    this.replaceRequest(updatedRequest);
    return { response: accepted, request: updatedRequest };
  }

  async declineResponse(requestId: string, responseId: string) {
    await this.maybeFail('declineResponse');
    const target = this.responses.find(
      (r) => r.id === responseId && r.requestId === requestId,
    );
    if (!target) {
      throw new ApiError('NOT_FOUND', 'Response not found', 404);
    }
    const declined: VolunteerResponse = {
      ...target,
      status: 'declined',
      declineReason: 'manually_declined',
      syncStatus: 'synced',
    };
    this.replaceResponse(declined);
    return { ...declined };
  }

  async withdrawResponse(
    requestId: string,
    responseId: string,
    volunteerId: string,
  ) {
    await this.maybeFail('withdrawResponse');
    const target = this.responses.find(
      (r) => r.id === responseId && r.requestId === requestId,
    );
    if (!target) {
      throw new ApiError('NOT_FOUND', 'Response not found', 404);
    }
    if (target.volunteerId !== volunteerId) {
      throw new ApiError('FORBIDDEN', 'Only the owner can withdraw', 403);
    }
    if (target.status !== 'pending') {
      throw new ApiError(
        'INVALID_STATE',
        'Only pending responses can be withdrawn',
        409,
      );
    }
    const withdrawn: VolunteerResponse = {
      ...target,
      status: 'withdrawn',
      syncStatus: 'synced',
    };
    this.replaceResponse(withdrawn);
    return { ...withdrawn };
  }

  async setRegistrationStatus(
    requestId: string,
    body: PatchRegistrationBody,
  ): Promise<RegistrationChangeResult> {
    await this.maybeFail('setRegistrationStatus');
    const requestRow = this.requests.find((r) => r.id === requestId);
    if (!requestRow) {
      throw new ApiError('NOT_FOUND', 'Request not found', 404);
    }
    const updatedRequest: HelpRequest = {
      ...requestRow,
      registrationStatus: body.status,
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    const declinePending = body.declinePending !== false;
    const declined: VolunteerResponse[] = [];
    if (body.status === 'closed' && declinePending) {
      for (const sibling of this.responses) {
        if (
          sibling.requestId === requestId &&
          sibling.status === 'pending'
        ) {
          const next: VolunteerResponse = {
            ...sibling,
            status: 'declined',
            declineReason: 'registration_closed',
            syncStatus: 'synced',
          };
          this.replaceResponse(next);
          declined.push(next);
        }
      }
    }
    this.replaceRequest(updatedRequest);
    return { request: updatedRequest, declined };
  }

  async patchStatus(id: string, body: PatchStatusBody) {
    await this.maybeFail('patchStatus');
    const idx = this.requests.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new ApiError('NOT_FOUND', 'Request not found', 404);
    }
    const updated: HelpRequest = {
      ...this.requests[idx],
      status: body.status,
      assignedVolunteerId:
        body.assignedVolunteerId ?? this.requests[idx].assignedVolunteerId,
      updatedAt: nowIso(),
      syncStatus: 'synced',
    };
    this.replaceRequest(updated);
    return { ...updated };
  }

  async getUser(id: string) {
    await this.maybeFail('getUser');
    const u = this.users.find((x) => x.id === id);
    if (!u) throw new ApiError('NOT_FOUND', 'User not found', 404);
    return { ...u };
  }

  async listNotifications(userId: string) {
    await this.maybeFail('listNotifications');
    return this.notifications.map((n) => ({
      ...n,
      payload: { ...n.payload, userId },
    }));
  }

  async register(body: RegisterUserBody): Promise<AuthLoginResult> {
    await this.maybeFail('register');
    if (!body.email || !body.password || !body.fullName) {
      throw new ApiError(
        'VALIDATION',
        'fullName, email, password are required',
        400,
      );
    }
    if (this.auths.some((a) => a.email === body.email)) {
      throw new ApiError('CONFLICT', 'Email already registered', 409);
    }
    const roles = body.wantsToVolunteer
      ? (['requester', 'volunteer'] as const)
      : (['requester'] as const);
    const newUser = createUserProfile({
      fullName: body.fullName,
      email: body.email,
      roles: [...roles],
    });
    this.users = [newUser, ...this.users];
    this.auths = [
      ...this.auths,
      {
        userId: newUser.id,
        email: body.email,
        password: body.password,
      },
    ];
    return { userId: newUser.id, user: newUser, roles: newUser.roles };
  }

  async login(body: LoginBody): Promise<AuthLoginResult> {
    await this.maybeFail('login');
    const auth = this.auths.find((a) => a.email === body.email);
    if (!auth || auth.password !== body.password) {
      throw new ApiError('UNAUTHORIZED', 'Invalid credentials', 401);
    }
    const user = this.users.find((u) => u.id === auth.userId);
    if (!user) {
      throw new ApiError('NOT_FOUND', 'User profile missing', 404);
    }
    return { userId: user.id, user, roles: user.roles };
  }

  // Test utilities
  __pushRequest(r: HelpRequest): void {
    this.requests = [r, ...this.requests];
  }
  __pushNotification(e: NotificationEvent): void {
    this.notifications = [e, ...this.notifications];
  }
  __pushNotificationEvent(type: any): void {
    this.__pushNotification(createNotificationEvent({ type }));
  }
  __seedAuth(email: string, password: string, userId: string): void {
    this.auths = [...this.auths, { userId, email, password }];
  }
}
