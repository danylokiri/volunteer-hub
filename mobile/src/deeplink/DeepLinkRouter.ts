// Centralized URL → Destination router. Pure parser plus navigation
// dispatch. The parsing rules are documented in the URL → Destination
// table in the plan §10. Both the custom scheme (`volunteerhub://`)
// and the demo HTTPS scheme (`https://volunteerhub.local/`) flow
// through the same `parseURL`. Unknown links return null and are
// silently ignored.

import { Destination } from '../domain/destinations/Destination';

export type DeepLinkRouterDeps = {
  /** Called for every recognized destination after auth gating. */
  navigateToDestination: (dest: Destination) => void;
  /** Used to gate Invite-style destinations behind login. */
  isAuthenticated: () => boolean;
  /** Persist a pending destination to be resumed after login. */
  persistPendingDestination: (dest: Destination) => void;
  /** Where to send unauthenticated users carrying a pending destination. */
  navigateToLogin: () => void;
};

export const CUSTOM_SCHEME = 'volunteerhub:';
export const HTTPS_HOST = 'volunteerhub.local';

export class DeepLinkRouter {
  constructor(private deps: DeepLinkRouterDeps) {}

  parseURL(url: string): Destination | null {
    if (!url) return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    let segments: string[];
    let searchParams: URLSearchParams;
    if (parsed.protocol === CUSTOM_SCHEME) {
      // For `volunteerhub://catalog?filter=x` the URL parser stores
      // `catalog` in `host` and the query in `searchParams`.
      const head = parsed.host;
      const tail = parsed.pathname.split('/').filter(Boolean);
      segments = head ? [head, ...tail] : tail;
      searchParams = parsed.searchParams;
    } else if (
      parsed.protocol === 'https:' &&
      parsed.host.toLowerCase() === HTTPS_HOST
    ) {
      segments = parsed.pathname.split('/').filter(Boolean);
      searchParams = parsed.searchParams;
    } else {
      return null;
    }

    if (segments.length === 0) return null;

    const head = segments[0];

    switch (head) {
      case 'home':
        return { kind: 'Home' };
      case 'requests': {
        const id = segments[1];
        if (!id) return null;
        return { kind: 'Detail', id };
      }
      case 'catalog': {
        const filter = searchParams.get('filter') ?? undefined;
        return { kind: 'Catalog', filter };
      }
      case 'invite': {
        const token = segments[1];
        if (!token) return null;
        return { kind: 'Invite', token };
      }
      case 'notifications':
        return { kind: 'Notifications' };
      case 'profile':
        return { kind: 'Profile' };
      case 'security':
        return { kind: 'Security' };
      default:
        return null;
    }
  }

  handle(url: string): Destination | null {
    const dest = this.parseURL(url);
    if (!dest) return null;
    // Auth gate: Invite requires login; if not authenticated we save
    // the destination for later and bounce to Login.
    if (dest.kind === 'Invite' && !this.deps.isAuthenticated()) {
      this.deps.persistPendingDestination(dest);
      this.deps.navigateToLogin();
      return dest;
    }
    this.navigate(dest);
    return dest;
  }

  navigate(dest: Destination): void {
    this.deps.navigateToDestination(dest);
  }
}
