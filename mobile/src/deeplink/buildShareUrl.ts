// Single source of truth for share/invite URLs. Returns the custom
// scheme form so the device's app picker offers VolunteerHub directly.

import { HelpRequest } from '../domain/models/HelpRequest';
import { CUSTOM_SCHEME } from './DeepLinkRouter';

export function buildShareUrl(req: Pick<HelpRequest, 'id'>): string {
  return `${CUSTOM_SCHEME}//requests/${req.id}`;
}

export function buildInviteUrl(token: string): string {
  return `${CUSTOM_SCHEME}//invite/${encodeURIComponent(token)}`;
}
