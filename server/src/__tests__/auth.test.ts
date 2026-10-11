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

describe('Phase 6 — Auth (course-scope sha-256 + per-user salt)', () => {
  it('AUTH1: register validates fullName, email, password length', async () => {
    const app = buildApp();
    const noEmail = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Хтось', password: 'pass1234' });
    expect(noEmail.status).toBe(400);
    expect(noEmail.body.error.code).toBe('VALIDATION');

    const shortPass = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Хтось', email: 'x@y.io', password: '123' });
    expect(shortPass.status).toBe(400);
  });

  it('AUTH2: register creates a UserProfile with requester role; volunteer optional', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Нова Людина',
        email: 'new@volunteerhub.local',
        password: 'demo1234',
        wantsToVolunteer: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.userId).toEqual(expect.any(String));
    expect(res.body.user.fullName).toBe('Нова Людина');
    expect(res.body.roles).toEqual(['requester', 'volunteer']);

    const requesterOnly = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Лише Замовник',
        email: 'requester-only-fresh@volunteerhub.local',
        password: 'demo1234',
      });
    expect(requesterOnly.body.roles).toEqual(['requester']);
  });

  it('AUTH3: register rejects duplicate email with 409 CONFLICT', async () => {
    const app = buildApp();
    const first = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Перший Користувач',
        email: 'dup@volunteerhub.local',
        password: 'pw1234',
      });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Другий Користувач',
        email: 'dup@volunteerhub.local',
        password: 'pw1234',
      });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('AUTH4: login with seeded demo credentials returns userId + roles', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@volunteerhub.local', password: 'demo1234' });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('demo-user-id');
    expect(res.body.roles).toEqual(
      expect.arrayContaining(['requester', 'volunteer']),
    );
  });

  it('AUTH5: login rejects wrong password with 401', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@volunteerhub.local', password: 'wrong-pass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('AUTH6: admin seeded login returns admin role', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@volunteerhub.local', password: 'admin1234' });
    expect(res.status).toBe(200);
    expect(res.body.roles).toContain('admin');
  });

  it('AUTH6b: requester@ and volunteer@ seeded credentials log in successfully', async () => {
    const app = buildApp();
    const requester = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'requester@volunteerhub.local',
        password: 'requester1234',
      });
    expect(requester.status).toBe(200);
    expect(requester.body.userId).toBe('requester-account-id');
    expect(requester.body.roles).toEqual(['requester', 'volunteer']);

    const volunteer = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'volunteer@volunteerhub.local',
        password: 'volunteer1234',
      });
    expect(volunteer.status).toBe(200);
    expect(volunteer.body.userId).toBe('volunteer-account-id');
    expect(volunteer.body.roles).toEqual(['requester', 'volunteer']);
  });

  it('AUTH7: stored auth record uses per-user salt (not deterministic hash)', async () => {
    const app = buildApp();
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Salt One',
        email: 'salt-a@x.io',
        password: 'samepass',
      });
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Salt Two',
        email: 'salt-b@x.io',
        password: 'samepass',
      });
    const db = await loadDb();
    const a = db.auths!.find((r) => r.email === 'salt-a@x.io');
    const b = db.auths!.find((r) => r.email === 'salt-b@x.io');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    // Same plaintext password but different salts → different hashes.
    expect(a!.passwordSalt).not.toBe(b!.passwordSalt);
    expect(a!.passwordHash).not.toBe(b!.passwordHash);
  });
});
