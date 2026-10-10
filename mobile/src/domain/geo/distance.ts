// Pure geolocation helpers used by RequestRepository's nearby filter
// and RequestsListScreen's distance sort. Haversine formula -- standard
// great-circle distance, accurate within ~0.5% at small distances.
// Intentionally has zero React or storage dependencies so it stays
// trivially testable.

import { HelpRequest } from '../models/HelpRequest';

export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function calculateDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function filterNearbyRequests(
  requests: HelpRequest[],
  reference: Coordinates,
  radiusKm: number,
): HelpRequest[] {
  if (radiusKm <= 0) return [];
  return requests.filter(
    (r) =>
      calculateDistanceKm(
        { latitude: r.latitude, longitude: r.longitude },
        reference,
      ) <= radiusKm,
  );
}

export function sortByDistance(
  requests: HelpRequest[],
  reference: Coordinates,
): HelpRequest[] {
  return [...requests].sort((a, b) => {
    const da = calculateDistanceKm(
      { latitude: a.latitude, longitude: a.longitude },
      reference,
    );
    const db = calculateDistanceKm(
      { latitude: b.latitude, longitude: b.longitude },
      reference,
    );
    return da - db;
  });
}
