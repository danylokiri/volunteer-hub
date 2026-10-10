import {
  calculateDistanceKm,
  filterNearbyRequests,
  sortByDistance,
} from '../../domain/geo/distance';
import { createHelpRequest } from '../../domain/models/HelpRequest';

const KYIV = { latitude: 50.4501, longitude: 30.5234 };
const LVIV = { latitude: 49.8397, longitude: 24.0297 };

function reqAt(id: string, latitude: number, longitude: number) {
  return createHelpRequest({
    id,
    title: id,
    description: '',
    category: 'other',
    latitude,
    longitude,
    createdByUserId: 'u',
    syncStatus: 'synced',
  });
}

describe('Phase 3 — Geolocation utilities', () => {
  it('H67: calculateDistanceKm Kyiv → Lviv ≈ 469 km (within tolerance)', () => {
    const km = calculateDistanceKm(KYIV, LVIV);
    expect(km).toBeGreaterThan(460);
    expect(km).toBeLessThan(480);
  });

  it('H67b: same point → 0 km', () => {
    expect(calculateDistanceKm(KYIV, KYIV)).toBeCloseTo(0, 5);
  });

  it('H68: filterNearbyRequests excludes far-away requests beyond radius', () => {
    const near = reqAt('near', KYIV.latitude + 0.001, KYIV.longitude + 0.001);
    const far = reqAt('far', LVIV.latitude, LVIV.longitude);
    const result = filterNearbyRequests([near, far], KYIV, 2);
    expect(result.map((r) => r.id)).toEqual(['near']);
  });

  it('H69: sortByDistance orders ascending by distance to reference', () => {
    const r1 = reqAt('r1', KYIV.latitude + 0.05, KYIV.longitude); // ~5 km
    const r2 = reqAt('r2', KYIV.latitude + 0.005, KYIV.longitude); // ~0.5 km
    const r3 = reqAt('r3', KYIV.latitude + 0.02, KYIV.longitude); // ~2 km

    const sorted = sortByDistance([r1, r2, r3], KYIV);
    expect(sorted.map((r) => r.id)).toEqual(['r2', 'r3', 'r1']);
  });

  it('H70: filterNearbyRequests returns [] for empty input or zero radius (no crash)', () => {
    expect(filterNearbyRequests([], KYIV, 5)).toEqual([]);
    const r = reqAt('r', KYIV.latitude, KYIV.longitude);
    expect(filterNearbyRequests([r], KYIV, 0)).toEqual([]);
  });
});
