import { DeepLinkRouter } from '../../deeplink/DeepLinkRouter';
import { MockDeepLinkRouter } from '../../deeplink/MockDeepLinkRouter';
import { buildShareUrl } from '../../deeplink/buildShareUrl';
import { Destination } from '../../domain/destinations/Destination';

function makeRouter(opts: {
  authenticated?: boolean;
  navigated?: jest.Mock;
  pendingPersisted?: jest.Mock;
  loginNavigated?: jest.Mock;
} = {}) {
  const navigated = opts.navigated ?? jest.fn();
  const pendingPersisted = opts.pendingPersisted ?? jest.fn();
  const loginNavigated = opts.loginNavigated ?? jest.fn();

  const router = new DeepLinkRouter({
    navigateToDestination: navigated,
    isAuthenticated: () => opts.authenticated ?? true,
    persistPendingDestination: pendingPersisted,
    navigateToLogin: loginNavigated,
  });

  return { router, navigated, pendingPersisted, loginNavigated };
}

describe('Phase 7 — DeepLinkRouter parseURL', () => {
  it('E36: parseURL("volunteerhub://requests/123") returns Detail("123")', () => {
    const { router } = makeRouter();
    expect(router.parseURL('volunteerhub://requests/123')).toEqual({
      kind: 'Detail',
      id: '123',
    });
  });

  it('E37: parseURL("volunteerhub://catalog?filter=nearby") returns Catalog("nearby")', () => {
    const { router } = makeRouter();
    expect(router.parseURL('volunteerhub://catalog?filter=nearby')).toEqual({
      kind: 'Catalog',
      filter: 'nearby',
    });
  });

  it('E38: parseURL("volunteerhub://catalog") returns Catalog(undefined)', () => {
    const { router } = makeRouter();
    expect(router.parseURL('volunteerhub://catalog')).toEqual({
      kind: 'Catalog',
      filter: undefined,
    });
  });

  it('E39: parseURL("volunteerhub://invite/ABC") returns Invite("ABC")', () => {
    const { router } = makeRouter();
    expect(router.parseURL('volunteerhub://invite/ABC')).toEqual({
      kind: 'Invite',
      token: 'ABC',
    });
  });

  it('E40: parseURL("https://volunteerhub.local/requests/999") returns Detail("999")', () => {
    const { router } = makeRouter();
    expect(
      router.parseURL('https://volunteerhub.local/requests/999'),
    ).toEqual({ kind: 'Detail', id: '999' });
  });

  it('E40b: parseURL("https://volunteerhub.local/invite/TOKEN") returns Invite', () => {
    const { router } = makeRouter();
    expect(router.parseURL('https://volunteerhub.local/invite/TOKEN')).toEqual({
      kind: 'Invite',
      token: 'TOKEN',
    });
  });

  it('E41: parseURL("volunteerhub://unknown/route") returns null', () => {
    const { router } = makeRouter();
    expect(router.parseURL('volunteerhub://unknown/route')).toBeNull();
  });

  it('E42: parseURL("") returns null', () => {
    const { router } = makeRouter();
    expect(router.parseURL('')).toBeNull();
  });

  it('parseURL returns null for malformed strings without throwing', () => {
    const { router } = makeRouter();
    expect(router.parseURL('not-a-url')).toBeNull();
    expect(router.parseURL('http://example.com/anything')).toBeNull();
  });
});

describe('Phase 7 — DeepLinkRouter handle', () => {
  it('E43: handle("volunteerhub://requests/123") calls navigate(Detail("123"))', () => {
    const { router, navigated } = makeRouter();
    router.handle('volunteerhub://requests/123');
    expect(navigated).toHaveBeenCalledWith({ kind: 'Detail', id: '123' });
  });

  it('E44: handle("volunteerhub://invalid") does not call navigate', () => {
    const { router, navigated } = makeRouter();
    router.handle('volunteerhub://invalid');
    expect(navigated).not.toHaveBeenCalled();
  });

  it('E44b: handle("") does not call navigate', () => {
    const { router, navigated } = makeRouter();
    router.handle('');
    expect(navigated).not.toHaveBeenCalled();
  });

  it('handle("volunteerhub://invite/ABC") when not authenticated persists pending and navigates to login', () => {
    const { router, navigated, pendingPersisted, loginNavigated } = makeRouter(
      {
        authenticated: false,
      },
    );
    router.handle('volunteerhub://invite/ABC');
    expect(pendingPersisted).toHaveBeenCalledWith({
      kind: 'Invite',
      token: 'ABC',
    });
    expect(loginNavigated).toHaveBeenCalled();
    expect(navigated).not.toHaveBeenCalled();
  });

  it('handle("volunteerhub://invite/ABC") when authenticated navigates directly', () => {
    const { router, navigated } = makeRouter({ authenticated: true });
    router.handle('volunteerhub://invite/ABC');
    expect(navigated).toHaveBeenCalledWith({
      kind: 'Invite',
      token: 'ABC',
    });
  });
});

describe('Phase 7 — buildShareUrl + RouteContext', () => {
  it('E46: buildShareUrl(req) returns "volunteerhub://requests/{id}"', () => {
    expect(buildShareUrl({ id: 'abc-123' })).toBe(
      'volunteerhub://requests/abc-123',
    );
  });

  it('E45: navigate(Detail("123")) updates centralized current route', () => {
    let current: Destination | null = null;
    const router = new DeepLinkRouter({
      navigateToDestination: (dest) => {
        current = dest;
      },
      isAuthenticated: () => true,
      persistPendingDestination: jest.fn(),
      navigateToLogin: jest.fn(),
    });
    router.navigate({ kind: 'Detail', id: '123' });
    expect(current).toEqual({ kind: 'Detail', id: '123' });
  });
});

describe('Phase 7 — MockDeepLinkRouter (Debug screen pipe)', () => {
  it('E47: feed(url) calls the same handle()', () => {
    const { router, navigated } = makeRouter();
    const mock = new MockDeepLinkRouter(router);
    mock.feed('volunteerhub://requests/777');
    expect(navigated).toHaveBeenCalledWith({ kind: 'Detail', id: '777' });
  });
});
