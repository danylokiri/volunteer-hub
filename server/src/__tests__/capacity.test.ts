import request from 'supertest';
import { buildApp } from '../app';
import { __setDb, flushNow, loadDb } from '../storage/db';
import { buildSeed } from '../seed/seed';

beforeEach(() => {
  __setDb(buildSeed());
});

afterEach(async () => {
  await flushNow();
});

describe('Phase 5 — capacity-aware response flow', () => {
  it('CAP1: POST /requests with mode=limited requires volunteerSlots >= 1', async () => {
    const app = buildApp();
    const bad = await request(app)
      .post('/api/v1/requests')
      .send({
        title: 't',
        description: 'd',
        category: 'pets',
        latitude: 50,
        longitude: 30,
        createdByUserId: 'demo-user-id',
        volunteerSlotsMode: 'limited',
      });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION');
    expect(bad.body.error.message).toContain('volunteerSlots');

    const good = await request(app)
      .post('/api/v1/requests')
      .send({
        title: 't',
        description: 'd',
        category: 'pets',
        latitude: 50,
        longitude: 30,
        createdByUserId: 'demo-user-id',
        volunteerSlotsMode: 'limited',
        volunteerSlots: 2,
      });
    expect(good.status).toBe(201);
    expect(good.body.volunteerSlotsMode).toBe('limited');
    expect(good.body.volunteerSlots).toBe(2);
    expect(good.body.registrationStatus).toBe('open');
  });

  it('CAP2: accept transitions request to in_progress and adds volunteer to acceptedVolunteerIds', async () => {
    const app = buildApp();
    // res-1 is pending on req-1 (unlimited slots). Accepting it should
    // not auto-close registration.
    const accept = await request(app)
      .patch('/api/v1/requests/req-1/responses/res-1/accept')
      .send({});
    expect(accept.status).toBe(200);
    expect(accept.body.response.status).toBe('accepted');
    expect(accept.body.request.status).toBe('in_progress');
    expect(accept.body.request.acceptedVolunteerIds).toContain('demo-user-id');
    expect(accept.body.request.registrationStatus).toBe('open');
  });

  it('CAP3: accept on a limited(1) request closes registration and auto-declines siblings', async () => {
    const app = buildApp();
    const db = await loadDb();
    // Add a sibling pending response on req-2 (limited 1 slot).
    db.responses.push({
      id: 'res-extra',
      requestId: 'req-2',
      volunteerId: 'olena-id',
      message: 'теж можу',
      status: 'pending',
      createdAt: '2026-04-30T11:00:00.000Z',
      syncStatus: 'synced',
    });

    const accept = await request(app)
      .patch('/api/v1/requests/req-2/responses/res-3/accept')
      .send({});
    expect(accept.status).toBe(200);
    expect(accept.body.request.registrationStatus).toBe('closed');

    // Sibling should be declined with reason 'capacity_filled'.
    const after = await loadDb();
    const sibling = after.responses.find((r) => r.id === 'res-extra');
    expect(sibling?.status).toBe('declined');
    expect(sibling?.declineReason).toBe('capacity_filled');
  });

  it('CAP4: POST /responses on a closed request returns 409', async () => {
    const app = buildApp();
    // Close req-1 manually first.
    await request(app)
      .patch('/api/v1/requests/req-1/registration')
      .send({ status: 'closed', declinePending: false });

    const res = await request(app)
      .post('/api/v1/requests/req-1/responses')
      .send({ volunteerId: 'mykola-id', message: 'допоможу' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REGISTRATION_CLOSED');
  });

  it('CAP5: registration close with declinePending auto-declines pending siblings with registration_closed reason', async () => {
    const app = buildApp();
    const close = await request(app)
      .patch('/api/v1/requests/req-1/registration')
      .send({ status: 'closed', declinePending: true });
    expect(close.status).toBe(200);
    expect(close.body.request.registrationStatus).toBe('closed');
    expect(close.body.declined.length).toBeGreaterThanOrEqual(1);
    const declined = close.body.declined[0];
    expect(declined.declineReason).toBe('registration_closed');
  });

  it('CAP6: withdraw checks owner and rejects on wrong volunteerId', async () => {
    const app = buildApp();
    const wrong = await request(app)
      .patch('/api/v1/requests/req-1/responses/res-1/withdraw')
      .send({ volunteerId: 'olena-id' });
    expect(wrong.status).toBe(403);

    const right = await request(app)
      .patch('/api/v1/requests/req-1/responses/res-1/withdraw')
      .send({ volunteerId: 'demo-user-id' });
    expect(right.status).toBe(200);
    expect(right.body.status).toBe('withdrawn');
  });

  it('CAP7: completion_requested broadcasts the volunteer who requested', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch('/api/v1/requests/req-3/status')
      .send({
        status: 'completion_requested',
        requestedByVolunteerId: 'olena-id',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completion_requested');
  });
});
