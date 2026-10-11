// Single point for id generation so tests can mock it deterministically.
// In the app runtime, expo-crypto's randomUUID is preferred; in Jest
// (where jest-expo auto-mocks the native module) we fall back to a
// Math.random-based pseudo-id, which is unique enough for in-memory
// tests.

let crypto: typeof import('expo-crypto') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  crypto = require('expo-crypto');
} catch {
  crypto = null;
}

let counter = 0;

function fallbackId(): string {
  counter += 1;
  return (
    'id-' +
    Math.random().toString(36).slice(2, 10) +
    '-' +
    Date.now().toString(36) +
    '-' +
    counter.toString(36)
  );
}

export function generateId(): string {
  if (crypto && typeof crypto.randomUUID === 'function') {
    try {
      const uuid = crypto.randomUUID();
      if (typeof uuid === 'string' && uuid.length > 0) {
        return uuid;
      }
    } catch {
      // fall through to fallback
    }
  }
  return fallbackId();
}

export function nowIso(): string {
  return new Date().toISOString();
}
