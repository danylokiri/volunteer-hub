// Test-friendly socket manager with the same public interface as
// `SocketManager`. Used in tests (deterministic emit) and as a
// development substitute when no backend is running (interval-based
// emission). Does NOT extend SocketManager because the emit and timing
// model is intentionally different.

import { SocketConnectionState } from '../domain/enums';
import { SocketEvent } from './events';
import {
  buildSeedNotifications,
  buildSeedRequests,
  buildSeedResponses,
} from '../domain/seed/mockData';

export type MockSocketOptions = {
  /** Interval between auto-emits in dev runs. Tests use `emit()` directly. */
  intervalMs?: number;
  /** Disable the auto-emit interval (test default). */
  manual?: boolean;
};

const DEFAULT_INTERVAL = 3500;

export class MockSocketManager {
  private _state: SocketConnectionState = 'Disconnected';
  private timer: ReturnType<typeof setInterval> | null = null;
  private stateListeners = new Set<(state: SocketConnectionState) => void>();
  private messageListeners = new Set<(event: SocketEvent) => void>();
  private cursor = 0;
  private demoEvents: SocketEvent[];

  constructor(private options: MockSocketOptions = {}) {
    const requests = buildSeedRequests();
    const responses = buildSeedResponses();
    const notifications = buildSeedNotifications();
    this.demoEvents = [
      { type: 'request.created', payload: requests[0] },
      {
        type: 'request.status_changed',
        payload: { id: requests[1].id, status: 'in_progress' },
      },
      { type: 'response.created', payload: responses[0] },
      { type: 'notification.created', payload: notifications[0] },
    ];
  }

  get state(): SocketConnectionState {
    return this._state;
  }

  connect(_url: string): void {
    void _url;
    if (this._state === 'Connected' || this._state === 'Connecting') return;
    this.setState('Connecting');
    // Synchronously transition to Connected for deterministic tests.
    this.setState('Connected');
    if (!this.options.manual) {
      this.timer = setInterval(
        () => this.emitNext(),
        this.options.intervalMs ?? DEFAULT_INTERVAL,
      );
    }
  }

  disconnect(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setState('Disconnected');
  }

  send(_message: object): void {
    void _message;
    // No-op for the mock.
  }

  onMessage(handler: (event: SocketEvent) => void): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  onStateChange(
    handler: (state: SocketConnectionState) => void,
  ): () => void {
    this.stateListeners.add(handler);
    return () => this.stateListeners.delete(handler);
  }

  /** Test helper -- emit a specific event right now. */
  emit(event: SocketEvent): void {
    this.messageListeners.forEach((h) => h(event));
  }

  /** Test helper -- emit the next demo event from the rotating list. */
  emitNext(): SocketEvent {
    const ev = this.demoEvents[this.cursor % this.demoEvents.length];
    this.cursor += 1;
    this.emit(ev);
    return ev;
  }

  private setState(next: SocketConnectionState): void {
    if (this._state === next) return;
    this._state = next;
    this.stateListeners.forEach((l) => l(next));
  }
}
