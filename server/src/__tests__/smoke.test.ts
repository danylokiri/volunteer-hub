import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import WebSocket from 'ws';
import { buildApp } from '../app';
import { __setDb, flushNow } from '../storage/db';
import { buildSeed } from '../seed/seed';
import { attachWebSocket } from '../socket/server';
import { clients } from '../socket/broadcast';

beforeEach(() => {
  __setDb(buildSeed());
});

afterEach(async () => {
  // Drain any pending flush so tests don't leak file writes.
  await flushNow();
});

describe('Phase 5 — Backend smoke tests', () => {
  it('I71: GET /api/v1/health returns ok=true and HTTP 200', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ts).toBe('string');
  });

  it('I72: GET /api/v1/requests returns the seeded array; status filter works', async () => {
    const app = buildApp();
    const all = await request(app).get('/api/v1/requests');
    expect(all.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);
    expect(all.body.length).toBeGreaterThanOrEqual(6);

    const open = await request(app).get('/api/v1/requests?status=open');
    expect(open.body.every((r: any) => r.status === 'open')).toBe(true);
    expect(open.body.length).toBeGreaterThan(0);
  });

  it('I73: POST /api/v1/requests creates a record persisted to the DB', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/requests')
      .send({
        title: 'нове',
        description: 'тестовий опис',
        category: 'pets',
        latitude: 50.45,
        longitude: 30.52,
        createdByUserId: 'demo-user-id',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.title).toBe('нове');
    expect(res.body.syncStatus).toBe('synced');

    // Verify it shows up on a follow-up GET (server cache).
    const list = await request(app).get('/api/v1/requests');
    const found = list.body.find((r: any) => r.id === res.body.id);
    expect(found).toBeDefined();
  });

  it('I74: PATCH /api/v1/requests/:id/status updates status; rejects unknown status with 400', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch('/api/v1/requests/req-1/status')
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');

    const bad = await request(app)
      .patch('/api/v1/requests/req-1/status')
      .send({ status: 'definitely-not-a-status' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION');
  });

  it('I75: WebSocket client receives `request.created` after POST /api/v1/requests', async () => {
    const app = buildApp();
    const server = http.createServer(app);
    attachWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });

    const received: unknown[] = [];
    ws.on('message', (data) => {
      try {
        received.push(JSON.parse(data.toString()));
      } catch {
        /* ignore */
      }
    });

    await request(server)
      .post('/api/v1/requests')
      .send({
        title: 'broadcast test',
        description: 'опис',
        category: 'other',
        latitude: 50.45,
        longitude: 30.52,
        createdByUserId: 'demo-user-id',
      });

    // Allow the event loop to flush the broadcast.
    await new Promise((r) => setTimeout(r, 100));

    const evt = received.find(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        (e as any).type === 'request.created',
    );
    expect(evt).toBeDefined();
    expect((evt as any).payload.title).toBe('broadcast test');

    ws.close();
    // Wait for ws to close so afterEach doesn't see lingering sockets.
    await new Promise((r) => setTimeout(r, 50));
    clients.clear();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
