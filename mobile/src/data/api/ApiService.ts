// Real ApiService: thin fetch-based client over the backend-lite server.
// Tests inject a `fetch`-compatible implementation so we don't need a
// running server; production picks `globalThis.fetch` automatically.

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
import { HelpRequest } from '../../domain/models/HelpRequest';
import { NotificationEvent } from '../../domain/models/NotificationEvent';
import { UserProfile } from '../../domain/models/UserProfile';
import { VolunteerResponse } from '../../domain/models/VolunteerResponse';

export const DEFAULT_BASE_URL = 'http://localhost:4000/api/v1';

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export class HttpApiService implements ApiService {
  constructor(
    private baseUrl: string = DEFAULT_BASE_URL,
    private fetchImpl: FetchLike = globalThis.fetch as FetchLike,
  ) {}

  private buildQuery(params?: Record<string, unknown>): string {
    if (!params) return '';
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (!entries.length) return '';
    const search = entries
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join('&');
    return `?${search}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let code = 'API_ERROR';
      let message = `HTTP ${res.status}`;
      try {
        const data = (await res.json()) as { error?: { code?: string; message?: string } };
        if (data?.error?.code) code = data.error.code;
        if (data?.error?.message) message = data.error.message;
      } catch {
        /* ignore parse errors */
      }
      throw new ApiError(code, message, res.status);
    }
    return (await res.json()) as T;
  }

  health() {
    return this.request<{ ok: true; ts: string }>('GET', '/health');
  }

  listRequests(params?: ListRequestsParams) {
    return this.request<HelpRequest[]>(
      'GET',
      `/requests${this.buildQuery(params as Record<string, unknown>)}`,
    );
  }

  getRequest(id: string) {
    return this.request<HelpRequest>('GET', `/requests/${encodeURIComponent(id)}`);
  }

  createRequest(body: CreateRequestBody) {
    return this.request<HelpRequest>('POST', '/requests', body);
  }

  createResponse(requestId: string, body: CreateResponseBody) {
    return this.request<VolunteerResponse>(
      'POST',
      `/requests/${encodeURIComponent(requestId)}/responses`,
      body,
    );
  }

  acceptResponse(requestId: string, responseId: string) {
    return this.request<AcceptResponseResult>(
      'PATCH',
      `/requests/${encodeURIComponent(requestId)}/responses/${encodeURIComponent(responseId)}/accept`,
      {},
    );
  }

  declineResponse(requestId: string, responseId: string) {
    return this.request<VolunteerResponse>(
      'PATCH',
      `/requests/${encodeURIComponent(requestId)}/responses/${encodeURIComponent(responseId)}/decline`,
      {},
    );
  }

  withdrawResponse(
    requestId: string,
    responseId: string,
    volunteerId: string,
  ) {
    return this.request<VolunteerResponse>(
      'PATCH',
      `/requests/${encodeURIComponent(requestId)}/responses/${encodeURIComponent(responseId)}/withdraw`,
      { volunteerId },
    );
  }

  setRegistrationStatus(
    requestId: string,
    body: PatchRegistrationBody,
  ) {
    return this.request<RegistrationChangeResult>(
      'PATCH',
      `/requests/${encodeURIComponent(requestId)}/registration`,
      body,
    );
  }

  patchStatus(id: string, body: PatchStatusBody) {
    return this.request<HelpRequest>(
      'PATCH',
      `/requests/${encodeURIComponent(id)}/status`,
      body,
    );
  }

  getUser(id: string) {
    return this.request<UserProfile>('GET', `/users/${encodeURIComponent(id)}`);
  }

  listNotifications(userId: string) {
    return this.request<NotificationEvent[]>(
      'GET',
      `/notifications${this.buildQuery({ userId })}`,
    );
  }

  register(body: RegisterUserBody) {
    return this.request<AuthLoginResult>('POST', '/auth/register', body);
  }

  login(body: LoginBody) {
    return this.request<AuthLoginResult>('POST', '/auth/login', body);
  }
}
