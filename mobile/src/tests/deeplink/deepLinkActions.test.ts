// Verifies that every Destination compiles to a CommonActions.reset
// action with the right routes/state. This is what proves "deep link
// from outside resets the stack" + "repeated same link doesn't
// duplicate" at the action level. Real React Navigation behavior on a
// production stack is still a manual checklist item (see TEST_PLAN.md).

import { destinationToNavigationAction } from '../../app/providers/DeepLinkProvider';

type ResetPayload = {
  index: number;
  routes: Array<{
    name: string;
    params?: Record<string, unknown>;
    state?: { index: number; routes: { name: string; params?: Record<string, unknown> }[] };
  }>;
};

function asReset(action: { type: string; payload?: unknown }): ResetPayload {
  expect(action.type).toBe('RESET');
  expect(action.payload).toBeDefined();
  return action.payload as ResetPayload;
}

describe('Phase audit fix F-002 — destinationToNavigationAction', () => {
  it('Detail destination resets stack to MainTabs + RequestDetail', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Detail', id: '123' }),
    );
    expect(payload.index).toBe(1);
    expect(payload.routes).toEqual([
      { name: 'MainTabs' },
      { name: 'RequestDetail', params: { id: '123' } },
    ]);
  });

  it('repeated same Detail link produces equal reset actions (no stack accumulation)', () => {
    const a = destinationToNavigationAction({ kind: 'Detail', id: '123' });
    const b = destinationToNavigationAction({ kind: 'Detail', id: '123' });
    expect(a).toEqual(b);
    const pa = asReset(a);
    const pb = asReset(b);
    expect(pa.routes).toHaveLength(2);
    expect(pb.routes).toHaveLength(2);
  });

  it('Notifications destination resets MainTabs with Notifications tab active', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Notifications' }),
    );
    expect(payload.routes[0].name).toBe('MainTabs');
    expect(payload.routes[0].state?.routes).toEqual([
      { name: 'Notifications' },
    ]);
  });

  it('Profile destination resets MainTabs with Profile tab active', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Profile' }),
    );
    expect(payload.routes[0].state?.routes).toEqual([{ name: 'Profile' }]);
  });

  it('Security destination resets to MainTabs + SecuritySettings', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Security' }),
    );
    expect(payload.routes).toEqual([
      { name: 'MainTabs' },
      { name: 'SecuritySettings' },
    ]);
  });

  it('Catalog with filter passes the filter into the Requests tab params', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Catalog', filter: 'nearby' }),
    );
    expect(payload.routes[0].state?.routes[0]?.params?.filter).toBe('nearby');
  });

  it('Invite destination resets to MainTabs + Invite with token param', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Invite', token: 'TOKEN42' }),
    );
    expect(payload.routes).toEqual([
      { name: 'MainTabs' },
      { name: 'Invite', params: { token: 'TOKEN42' } },
    ]);
  });

  it('Home destination resets to a single MainTabs route', () => {
    const payload = asReset(
      destinationToNavigationAction({ kind: 'Home' }),
    );
    expect(payload.routes).toEqual([{ name: 'MainTabs' }]);
  });
});
