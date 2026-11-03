// Adapted from Thuận's 0e2e16f. Map markers do not require a geofence radius.
import { hasValidCoords } from '../location/geo';

export function getMapMarkers(pois) {
  const seen = new Set();
  return (Array.isArray(pois) ? pois : []).filter((p) => {
    if (typeof p?.id !== 'string' || !p.id.trim() || seen.has(p.id) ||
        !hasValidCoords({ ...p, radius_m: 1 })) return false;
    seen.add(p.id);
    return true;
  });
}

export const toCoordinate = (p) => ({ latitude: p.latitude, longitude: p.longitude });
