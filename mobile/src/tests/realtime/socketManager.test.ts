import { SocketManager } from '../../realtime/SocketManager';
import { MockSocketManager } from '../../realtime/MockSocketManager';
import { SocketEvent } from '../../realtime/events';

class FakeSocket {
  onopen: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  readyState = 0;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  __open() {
    this.readyState = 1;
    this.onopen?.();
  }

  __message(data: string) {
    this.onmessage?.({ data });
  }

  __close() {
    this.readyState = 3;
    this.onclose?.();
  }

  __error() {
    this.onerror?.();
  }
}

function makeFactory() {
  const sockets: FakeSocket[] = [];
  const factory = (_url: string) => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  };
  return { factory, sockets };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Phase 6 — SocketManager', () => {
  it('D20: initial state is "Disconnected"', () => {
    const m = new SocketManager();
    expect(m.state).toBe('Disconnected');
  });

  it('D21: connect transitions to "Connecting"', () => {
    const { factory } = makeFactory();
    const m = new SocketManager(factory);
    m.connect('ws://x');
    expect(m.state).toBe('Connecting');
  });

  it('D22: onopen transitions to "Connected"', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    m.connect('ws://x');
    sockets[0].__open();
    expect(m.state).toBe('Connected');
  });

  it('D23: disconnect from Connected → Disconnected (no reconnect scheduled)', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory, 5, 1000);
    m.connect('ws://x');
    sockets[0].__open();
    m.disconnect();
    expect(m.state).toBe('Disconnected');
    jest.advanceTimersByTime(5000);
    expect(m.state).toBe('Disconnected');
    expect(sockets.length).toBe(1);
  });

  it('D24: onclose from Connected → Reconnecting then schedules retry', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory, 1, 1000);
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__close();
    expect(m.state).toBe('Reconnecting');
    jest.advanceTimersByTime(1000);
    // Reconnect created a second socket
    expect(sockets.length).toBe(2);
    sockets[1].__open();
    expect(m.state).toBe('Connected');
  });

  it('D25: after 1 retry that fails again → Disconnected (budget exhausted)', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory, 1, 1000);
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__close();
    expect(m.state).toBe('Reconnecting');
    jest.advanceTimersByTime(1000);
    expect(sockets.length).toBe(2);
    // Second close exhausts retry budget.
    sockets[1].__close();
    expect(m.state).toBe('Disconnected');
  });

  it('D26: request.created JSON parses and is delivered', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const received: SocketEvent[] = [];
    m.onMessage((e) => received.push(e));
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__message(
      JSON.stringify({
        type: 'request.created',
        payload: {
          id: 'r-1',
          title: 't',
          description: 'd',
          category: 'pets',
          status: 'open',
          latitude: 0,
          longitude: 0,
          createdByUserId: 'u',
          createdAt: 'now',
          updatedAt: 'now',
          syncStatus: 'synced',
        },
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('request.created');
  });

  it('D27: request.status_changed JSON parses correctly', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const received: SocketEvent[] = [];
    m.onMessage((e) => received.push(e));
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__message(
      JSON.stringify({
        type: 'request.status_changed',
        payload: { id: 'r-1', status: 'completed' },
      }),
    );
    expect(received[0]).toEqual({
      type: 'request.status_changed',
      payload: { id: 'r-1', status: 'completed' },
    });
  });

  it('D28: invalid JSON does not crash; logs and ignores', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const received: SocketEvent[] = [];
    m.onMessage((e) => received.push(e));
    m.connect('ws://x');
    sockets[0].__open();
    expect(() => sockets[0].__message('definitely not json')).not.toThrow();
    expect(received).toHaveLength(0);
  });

  it('D29: unknown event type is ignored', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const received: SocketEvent[] = [];
    m.onMessage((e) => received.push(e));
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__message(
      JSON.stringify({ type: 'definitely.unknown', payload: {} }),
    );
    expect(received).toHaveLength(0);
  });

  it('D30: onMessage handler is called with parsed event', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const handler = jest.fn();
    m.onMessage(handler);
    m.connect('ws://x');
    sockets[0].__open();
    sockets[0].__message(
      JSON.stringify({
        type: 'notification.created',
        payload: { id: 'n', type: 'request.created', payload: {}, createdAt: 'now', read: false },
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('D31: send writes to underlying socket when Connected', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    m.connect('ws://x');
    sockets[0].__open();
    m.send({ hello: 'world' });
    expect(sockets[0].sent).toEqual([JSON.stringify({ hello: 'world' })]);
  });

  it('D32: send is a no-op (no throw) when Disconnected', () => {
    const m = new SocketManager();
    expect(() => m.send({ foo: 1 })).not.toThrow();
    expect(m.state).toBe('Disconnected');
  });

  it('D33: state listener fires on transitions (UI store updates)', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory);
    const states: string[] = [];
    m.onStateChange((s) => states.push(s));
    m.connect('ws://x');
    sockets[0].__open();
    m.disconnect();
    expect(states).toEqual(['Connecting', 'Connected', 'Disconnected']);
  });

  it('D34: MockSocketManager.connect sets state to Connected and emit() delivers events', () => {
    const m = new MockSocketManager({ manual: true });
    expect(m.state).toBe('Disconnected');
    m.connect('ws://mock');
    expect(m.state).toBe('Connected');
    const received: SocketEvent[] = [];
    m.onMessage((e) => received.push(e));
    const emitted = m.emitNext();
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe(emitted.type);
  });

  it('D35: error during open transitions to Reconnecting then succeeds', () => {
    const { factory, sockets } = makeFactory();
    const m = new SocketManager(factory, 1, 100);
    m.connect('ws://x');
    sockets[0].__error();
    expect(m.state).toBe('Reconnecting');
    jest.advanceTimersByTime(100);
    expect(sockets).toHaveLength(2);
    sockets[1].__open();
    expect(m.state).toBe('Connected');
  });

  it('D35b: factory throw transitions through Reconnecting and recovers', () => {
    let throwOnce = true;
    const sockets: FakeSocket[] = [];
    const factory = (_url: string) => {
      if (throwOnce) {
        throwOnce = false;
        throw new Error('boom');
      }
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    };
    const m = new SocketManager(factory, 1, 100);
    m.connect('ws://x');
    expect(m.state).toBe('Reconnecting');
    jest.advanceTimersByTime(100);
    expect(sockets).toHaveLength(1);
    sockets[0].__open();
    expect(m.state).toBe('Connected');
  });
});
