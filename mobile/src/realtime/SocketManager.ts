// Real WebSocket manager. State machine:
//   Disconnected → Connecting → Connected → Reconnecting → Disconnected
// On a failed connection or a close while connected, the manager
// schedules `maxRetries` retries with `retryDelayMs` between them, then
// gives up and lands in Disconnected. Send is a no-op when not
// connected (never throws). Incoming JSON is parsed and validated
// against the `SocketEvent` discriminated union; invalid messages are
// logged and ignored.

import { SocketConnectionState } from '../domain/enums';
import { isValidSocketEvent, SocketEvent } from './events';

export type SocketLike = {
  send(data: string): void;
  close(): void;
  onopen: ((ev?: unknown) => void) | null;
  onclose: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  readyState: number;
};

export type SocketFactory = (url: string) => SocketLike;

const DEFAULT_FACTORY: SocketFactory = (url) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (globalThis as any).WebSocket(url);

export class SocketManager {
  private _state: SocketConnectionState = 'Disconnected';
  private socket: SocketLike | null = null;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUrl: string | null = null;
  private stateListeners = new Set<(state: SocketConnectionState) => void>();
  private messageListeners = new Set<(event: SocketEvent) => void>();

  constructor(
    private factory: SocketFactory = DEFAULT_FACTORY,
    private maxRetries: number = 1,
    private retryDelayMs: number = 3000,
  ) {}

  get state(): SocketConnectionState {
    return this._state;
  }

  connect(url: string): void {
    if (this._state === 'Connecting' || this._state === 'Connected') return;
    this.currentUrl = url;
    this.setState('Connecting');
    let socket: SocketLike;
    try {
      socket = this.factory(url);
    } catch {
      this.scheduleRetryOrFail();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.retryCount = 0;
      this.setState('Connected');
    };
    socket.onclose = () => {
      this.handleDrop();
    };
    socket.onerror = () => {
      this.handleDrop();
    };
    socket.onmessage = (ev) => this.handleMessage(ev.data);
  }

  disconnect(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.retryCount = 0;
    this.setState('Disconnected');
  }

  send(message: object): void {
    if (this._state !== 'Connected' || !this.socket) return;
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      // network may have died between checks; safe no-op.
    }
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

  private setState(next: SocketConnectionState): void {
    if (this._state === next) return;
    this._state = next;
    this.stateListeners.forEach((l) => {
      try {
        l(next);
      } catch {
        // listener errors must not break the manager
      }
    });
  }

  private handleDrop(): void {
    // Clean up the dropped socket so we don't leak listeners.
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.scheduleRetryOrFail();
  }

  private scheduleRetryOrFail(): void {
    if (this.retryCount < this.maxRetries && this.currentUrl) {
      this.retryCount += 1;
      this.setState('Reconnecting');
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        const url = this.currentUrl;
        if (!url) return;
        // Drop down to Disconnected first to allow `connect` to proceed.
        this._state = 'Disconnected';
        this.connect(url);
      }, this.retryDelayMs);
    } else {
      this.retryCount = 0;
      this.setState('Disconnected');
    }
  }

  private handleMessage(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isValidSocketEvent(parsed)) return;
    this.messageListeners.forEach((h) => {
      try {
        h(parsed);
      } catch {
        // listener errors must not break the manager
      }
    });
  }
}
