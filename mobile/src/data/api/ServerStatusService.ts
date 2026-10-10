// Pings /health and reports a normalized status. Lives next to
// ApiService so it can be wired with the same fetchImpl. Pure — no
// React, no provider; ServerStatusProvider polls it on a timer.

import { ApiService } from './types';
import { ApiError } from './ApiError';

export type ServerStatusSnapshot = {
  online: boolean;
  latencyMs: number;
  ts: string;
  errorMessage?: string;
};

export class ServerStatusService {
  constructor(private api: ApiService) {}

  async ping(): Promise<ServerStatusSnapshot> {
    const start = Date.now();
    try {
      const result = await this.api.health();
      return {
        online: result.ok === true,
        latencyMs: Date.now() - start,
        ts: result.ts,
      };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Network error';
      return {
        online: false,
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
        errorMessage: message,
      };
    }
  }
}
