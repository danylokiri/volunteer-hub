// Auth route — course-scope. Stores per-user salt + sha256(salt+password)
// in the auths[] table inside db.json. No JWT, no cookies, no OAuth.
// The "session token" is just the userId; the mobile client persists it
// in AsyncStorage and sends it with subsequent requests when needed.
//
// On register we also seed default roles ('requester' + optional
// 'volunteer'). admin role is reserved for seeded accounts and is not
// settable from the public API.

import { createHash, randomBytes, randomUUID } from 'crypto';
import { Router } from 'express';
import { loadDb, scheduleFlush } from '../storage/db';
import { AuthRecord, UserProfile, UserRole } from '../types';

const SALT_BYTES = 16;

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function nowIso(): string {
  return new Date().toISOString();
}

function publicProfile(user: UserProfile): Omit<UserProfile, never> {
  // Strip nothing yet — passwordHash isn't on UserProfile, it's on
  // AuthRecord. Kept as a wrapper in case we add fields later.
  return { ...user };
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /\S+@\S+\.\S+/.test(value);
}

export function authRouter(): Router {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const db = await loadDb();
    db.auths = db.auths ?? [];

    const body = req.body ?? {};
    if (
      typeof body.fullName !== 'string' ||
      body.fullName.trim().length < 2
    ) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'fullName is required' },
      });
    }
    if (!isValidEmail(body.email)) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'email is required' },
      });
    }
    if (typeof body.password !== 'string' || body.password.length < 4) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'password must be at least 4 characters',
        },
      });
    }
    const email = body.email.trim().toLowerCase();
    if (db.auths.some((a) => a.email.toLowerCase() === email)) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Email already registered' },
      });
    }

    const roles: UserRole[] = body.wantsToVolunteer
      ? ['requester', 'volunteer']
      : ['requester'];

    const newUser: UserProfile = {
      id: randomUUID(),
      fullName: body.fullName.trim(),
      rating: 0,
      completedRequests: 0,
      isVerified: false,
      createdAt: nowIso(),
      email,
      roles,
    };

    const salt = randomBytes(SALT_BYTES).toString('hex');
    const newAuth: AuthRecord = {
      userId: newUser.id,
      email,
      passwordHash: hashPassword(body.password, salt),
      passwordSalt: salt,
      createdAt: nowIso(),
    };

    db.users.unshift(newUser);
    db.auths.push(newAuth);
    scheduleFlush();

    res.status(201).json({
      userId: newUser.id,
      user: publicProfile(newUser),
      roles: newUser.roles,
    });
  });

  router.post('/auth/login', async (req, res) => {
    const db = await loadDb();
    db.auths = db.auths ?? [];

    const body = req.body ?? {};
    if (!isValidEmail(body.email) || typeof body.password !== 'string') {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'email and password required' },
      });
    }
    const email = body.email.trim().toLowerCase();
    const auth = db.auths.find((a) => a.email.toLowerCase() === email);
    if (!auth) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const expected = hashPassword(body.password, auth.passwordSalt);
    if (expected !== auth.passwordHash) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const user = db.users.find((u) => u.id === auth.userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'User profile missing' } });
    }
    res.json({
      userId: user.id,
      user: publicProfile(user),
      roles: user.roles ?? ['requester', 'volunteer'],
    });
  });

  return router;
}

// Exposed so the seed script can pre-bake the demo accounts with a
// known password.
export function __seedAuthRecord(
  userId: string,
  email: string,
  password: string,
): AuthRecord {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  return {
    userId,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    createdAt: nowIso(),
  };
}
