// JSON-file persistence with debounced flush. Keeping it simple --
// reads load the whole file into memory; writes are queued and flushed
// after a short delay. Atomic enough for the course demo, no migrations.

import { promises as fs } from 'fs';
import path from 'path';
import { Database } from '../types';

const DB_FILE = path.resolve(__dirname, '../../data/db.json');

const FLUSH_INTERVAL_MS = 50;

let cache: Database | null = null;
let flushTimer: NodeJS.Timeout | null = null;

function emptyDb(): Database {
  return {
    users: [],
    requests: [],
    responses: [],
    notifications: [],
    auths: [],
  };
}

export async function loadDb(): Promise<Database> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    cache = JSON.parse(raw) as Database;
  } catch {
    cache = emptyDb();
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
  }
  return cache;
}

async function flush(): Promise<void> {
  if (!cache) return;
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

/** Force an immediate flush -- used by tests so assertions see fresh data. */
export async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}

/** Override the in-memory cache (for tests). */
export function __setDb(next: Database): void {
  cache = next;
}

/** Read the in-memory cache directly without disk I/O (tests only). */
export function __peekDb(): Database | null {
  return cache;
}
