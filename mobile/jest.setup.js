/* eslint-disable @typescript-eslint/no-require-imports */

// In-memory AsyncStorage mock. The official package ships its own mock
// at `@react-native-async-storage/async-storage/jest/async-storage-mock`,
// which we use directly so calls behave like a real store across tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-crypto's randomUUID is mocked to undefined by jest-expo on
// some setups; idGenerator already has a fallback, but pinning the
// mock here keeps tests deterministic if needed.
jest.mock('expo-crypto', () => ({
  randomUUID: () =>
    'uuid-' +
    Math.random().toString(36).slice(2, 10) +
    '-' +
    Date.now().toString(36),
}));

// Silence the act() warning that shows up when a state update happens
// after a render. In our integration tests the providers do small
// async setup that resolves naturally; we don't need React's noisy
// dev-only warning.
const originalError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('not wrapped in act') ||
      message.includes('Warning: An update to'))
  ) {
    return;
  }
  originalError(...args);
};
