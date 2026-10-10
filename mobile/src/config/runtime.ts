// Runtime configuration: returns the API base URL and WebSocket URL
// for the current environment. Android emulators reach the host PC via
// 10.0.2.2 (the special host-loopback alias), not 127.0.0.1 — so the
// default differs by Platform.
//
// Override either with EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WS_URL
// (read at bundle time by Expo). Useful for staging hosts, ngrok
// tunnels, or pointing the iOS simulator at a custom port.

import { Platform } from 'react-native';

const HOST_LOOPBACK = '127.0.0.1';
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const PORT = 4000;

function readEnv(name: string): string | undefined {
  // process.env values are inlined by Expo's bundler at build time.
  const value = (process.env as Record<string, string | undefined>)[name];
  return value && value.length > 0 ? value : undefined;
}

function defaultHost(): string {
  // Android emulator uses 10.0.2.2 to reach the host machine.
  // iOS simulator and web run on the host so localhost is fine.
  return Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : HOST_LOOPBACK;
}

export function getApiBaseUrl(): string {
  const explicit = readEnv('EXPO_PUBLIC_API_URL');
  if (explicit) return explicit;
  return `http://${defaultHost()}:${PORT}/api/v1`;
}

export function getWsUrl(): string {
  const explicit = readEnv('EXPO_PUBLIC_WS_URL');
  if (explicit) return explicit;
  return `ws://${defaultHost()}:${PORT}`;
}

// Re-exported for tests / debug-mode display.
export const RUNTIME_CONSTANTS = {
  HOST_LOOPBACK,
  ANDROID_EMULATOR_HOST,
  PORT,
};
