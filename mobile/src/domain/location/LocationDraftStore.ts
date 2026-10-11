// Tiny module-level store used to ferry the user's location pick from
// LocationPickerScreen back into CreateRequestScreen across navigation
// pops. We cannot pass non-serializable callbacks via React Navigation
// route params (warnings + sealed types), so a process-local singleton
// keyed by an opaque token is the simplest reliable channel.

import { Coordinates } from '../geo/distance';

export type LocationDraft = {
  city: string;
  district: string;
  address: string;
  locationTitle: string;
  coordinates: Coordinates;
};

let lastDraft: LocationDraft | null = null;

export const LocationDraftStore = {
  set(draft: LocationDraft): void {
    lastDraft = { ...draft, coordinates: { ...draft.coordinates } };
  },
  consume(): LocationDraft | null {
    const out = lastDraft;
    lastDraft = null;
    return out;
  },
  /** Test/utility only — does not clear. */
  peek(): LocationDraft | null {
    return lastDraft;
  },
  reset(): void {
    lastDraft = null;
  },
};
