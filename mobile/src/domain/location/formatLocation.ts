// Pure formatters for human-readable request location. Used by
// RequestsListScreen, RequestDetailScreen, and the notification mapper.
//
// Three levels of detail:
//   primaryLine  — "Київ · Поділ · 1.2 км" (or without distance if no
//                  reference). City and district come from the record;
//                  if the record lacks them, derive from coords via the
//                  KYIV_DISTRICTS catalog.
//   secondaryLine — "вул. Нижній Вал, 15" or "біля м. Контрактова
//                  площа" — orientir from the district when the record
//                  has no explicit address.
//   technicalCoords — "50.4616, 30.5147" — only meant for debug/dev.

import { calculateDistanceKm, Coordinates } from '../geo/distance';
import { HelpRequest } from '../models/HelpRequest';
import {
  DEFAULT_CITY,
  findDistrictByCoords,
  findDistrictByName,
  KyivDistrict,
} from './HumanLocation';

function pickDistrict(req: HelpRequest): KyivDistrict {
  const fromName = findDistrictByName(req.district);
  if (fromName) return fromName;
  return findDistrictByCoords({
    latitude: req.latitude,
    longitude: req.longitude,
  });
}

function formatDistance(km: number): string {
  if (km < 0.1) return 'поруч';
  if (km < 1) return `${(km * 1000).toFixed(0)} м від вас`;
  if (km < 10) return `${km.toFixed(1)} км від вас`;
  return `${Math.round(km)} км від вас`;
}

export function formatPrimaryLocation(
  req: HelpRequest,
  reference?: Coordinates,
): string {
  const city = req.city ?? DEFAULT_CITY;
  const district = pickDistrict(req).name;
  const parts: string[] = [city, district];
  if (reference) {
    const km = calculateDistanceKm(
      { latitude: req.latitude, longitude: req.longitude },
      reference,
    );
    parts.push(formatDistance(km));
  }
  return parts.join(' · ');
}

export function formatSecondaryLocation(req: HelpRequest): string {
  if (req.address && req.address.trim()) return req.address.trim();
  if (req.locationTitle && req.locationTitle.trim())
    return req.locationTitle.trim();
  return pickDistrict(req).orientir;
}

export function formatTechnicalCoords(req: HelpRequest): string {
  return `${req.latitude.toFixed(4)}, ${req.longitude.toFixed(4)}`;
}
