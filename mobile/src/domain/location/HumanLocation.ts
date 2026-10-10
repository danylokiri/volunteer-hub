// Catalog of Kyiv districts used by the structured LocationPicker
// fallback. Each entry has a human label, a centroid (used when only
// district is known and we still need lat/lng for the nearby filter)
// and a short orientir hint that the seed data and UI can show.
//
// Pure data + helpers; no React, no storage. Phase 3 LocationPicker and
// the location-formatter both depend on this.

import { calculateDistanceKm, Coordinates } from '../geo/distance';

export type DistrictId =
  | 'podil'
  | 'pechersk'
  | 'shevchenkivskyi'
  | 'holosiivskyi'
  | 'darnytskyi'
  | 'desnianskyi'
  | 'dniprovskyi'
  | 'obolonskyi'
  | 'sviatoshynskyi'
  | 'solomianskyi';

export type KyivDistrict = {
  id: DistrictId;
  name: string;
  centroid: Coordinates;
  orientir: string;
};

export const KYIV_DISTRICTS: KyivDistrict[] = [
  {
    id: 'podil',
    name: 'Поділ',
    centroid: { latitude: 50.4616, longitude: 30.5147 },
    orientir: 'біля м. Контрактова площа',
  },
  {
    id: 'pechersk',
    name: 'Печерськ',
    centroid: { latitude: 50.4286, longitude: 30.5396 },
    orientir: 'біля м. Печерська',
  },
  {
    id: 'shevchenkivskyi',
    name: 'Шевченківський',
    centroid: { latitude: 50.4501, longitude: 30.5085 },
    orientir: 'біля м. Університет',
  },
  {
    id: 'holosiivskyi',
    name: 'Голосіївський',
    centroid: { latitude: 50.3849, longitude: 30.4983 },
    orientir: 'біля м. Голосіївська',
  },
  {
    id: 'darnytskyi',
    name: 'Дарницький',
    centroid: { latitude: 50.408, longitude: 30.6521 },
    orientir: 'біля м. Позняки',
  },
  {
    id: 'desnianskyi',
    name: 'Деснянський',
    centroid: { latitude: 50.5147, longitude: 30.6275 },
    orientir: 'біля м. Лісова',
  },
  {
    id: 'dniprovskyi',
    name: 'Дніпровський',
    centroid: { latitude: 50.4612, longitude: 30.6207 },
    orientir: 'біля м. Дарниця',
  },
  {
    id: 'obolonskyi',
    name: 'Оболонський',
    centroid: { latitude: 50.5137, longitude: 30.4986 },
    orientir: 'біля м. Оболонь',
  },
  {
    id: 'sviatoshynskyi',
    name: 'Святошинський',
    centroid: { latitude: 50.4544, longitude: 30.3872 },
    orientir: 'біля м. Святошин',
  },
  {
    id: 'solomianskyi',
    name: 'Солом’янський',
    centroid: { latitude: 50.4302, longitude: 30.4501 },
    orientir: 'біля м. Вокзальна',
  },
];

export const DEFAULT_CITY = 'Київ';
export const DEFAULT_DISTRICT_ID: DistrictId = 'podil';

export function findDistrictById(id: DistrictId | string | undefined): KyivDistrict | undefined {
  if (!id) return undefined;
  return KYIV_DISTRICTS.find((d) => d.id === id);
}

export function findDistrictByName(name: string | undefined): KyivDistrict | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  return KYIV_DISTRICTS.find((d) => d.name === trimmed);
}

/**
 * Pick the closest Kyiv district to a given coordinate. Used when a
 * record only has lat/lng (legacy data) and we need a label to display.
 */
export function findDistrictByCoords(
  coords: Coordinates,
): KyivDistrict {
  let best = KYIV_DISTRICTS[0];
  let bestDistance = calculateDistanceKm(coords, best.centroid);
  for (const d of KYIV_DISTRICTS.slice(1)) {
    const dd = calculateDistanceKm(coords, d.centroid);
    if (dd < bestDistance) {
      bestDistance = dd;
      best = d;
    }
  }
  return best;
}

export function defaultDistrict(): KyivDistrict {
  const found = findDistrictById(DEFAULT_DISTRICT_ID);
  if (!found) throw new Error('default district missing');
  return found;
}
