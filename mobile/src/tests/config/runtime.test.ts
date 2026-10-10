/**
 * Validates the platform-aware runtime config used to point the app at
 * the right host for the current device profile.
 *
 * - Android emulator → 10.0.2.2 (host loopback alias)
 * - iOS simulator / web → 127.0.0.1 (host's localhost)
 * - EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WS_URL override both
 */

const ORIGINAL_API = process.env.EXPO_PUBLIC_API_URL;
const ORIGINAL_WS = process.env.EXPO_PUBLIC_WS_URL;

afterEach(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL_API;
  process.env.EXPO_PUBLIC_WS_URL = ORIGINAL_WS;
  jest.resetModules();
  jest.dontMock('react-native');
});

function loadWithPlatform(os: 'android' | 'ios' | 'web') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    __esModule: true,
    Platform: { OS: os },
  }));
  return require('../../config/runtime') as typeof import('../../config/runtime');
}

describe('config/runtime — getApiBaseUrl / getWsUrl', () => {
  it('RT1: defaults to 10.0.2.2 on Android', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_WS_URL;
    const { getApiBaseUrl, getWsUrl } = loadWithPlatform('android');
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:4000/api/v1');
    expect(getWsUrl()).toBe('ws://10.0.2.2:4000');
  });

  it('RT2: defaults to 127.0.0.1 on iOS', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_WS_URL;
    const { getApiBaseUrl, getWsUrl } = loadWithPlatform('ios');
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:4000/api/v1');
    expect(getWsUrl()).toBe('ws://127.0.0.1:4000');
  });

  it('RT3: defaults to 127.0.0.1 on web', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_WS_URL;
    const { getApiBaseUrl, getWsUrl } = loadWithPlatform('web');
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:4000/api/v1');
    expect(getWsUrl()).toBe('ws://127.0.0.1:4000');
  });

  it('RT4: EXPO_PUBLIC_API_URL overrides everything', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://staging.volunteerhub.example/api/v2';
    const { getApiBaseUrl } = loadWithPlatform('android');
    expect(getApiBaseUrl()).toBe('https://staging.volunteerhub.example/api/v2');
  });

  it('RT5: EXPO_PUBLIC_WS_URL overrides everything', () => {
    process.env.EXPO_PUBLIC_WS_URL = 'wss://socket.volunteerhub.example/realtime';
    const { getWsUrl } = loadWithPlatform('android');
    expect(getWsUrl()).toBe('wss://socket.volunteerhub.example/realtime');
  });

  it('RT6: empty string env var falls through to platform default', () => {
    process.env.EXPO_PUBLIC_API_URL = '';
    const { getApiBaseUrl } = loadWithPlatform('android');
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:4000/api/v1');
  });
});
