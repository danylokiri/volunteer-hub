// Centralized destination union used by DeepLinkRouter and RouteContext.
// Adding a new destination requires updating: parseURL, navigate,
// and the linking config in app.json / linking prefixes.

export type Destination =
  | { kind: 'Home' }
  | { kind: 'Detail'; id: string }
  | { kind: 'Catalog'; filter?: string }
  | { kind: 'Invite'; token: string }
  | { kind: 'Notifications' }
  | { kind: 'Profile' }
  | { kind: 'Security' };

export const HOME_DESTINATION: Destination = { kind: 'Home' };

export function detailDestination(id: string): Destination {
  return { kind: 'Detail', id };
}

export function catalogDestination(filter?: string): Destination {
  return { kind: 'Catalog', filter };
}

export function inviteDestination(token: string): Destination {
  return { kind: 'Invite', token };
}

export function destinationsEqual(
  a: Destination | null,
  b: Destination | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'Detail':
      return a.id === (b as { kind: 'Detail'; id: string }).id;
    case 'Catalog':
      return a.filter === (b as { kind: 'Catalog'; filter?: string }).filter;
    case 'Invite':
      return a.token === (b as { kind: 'Invite'; token: string }).token;
    default:
      return true;
  }
}
