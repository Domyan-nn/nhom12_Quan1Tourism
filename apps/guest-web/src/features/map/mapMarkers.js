// Public IDs are opaque strings. Never coerce coordinates from null/strings.
export function getMapMarkers(pois) {
  const seen = new Set();
  return (Array.isArray(pois) ? pois : []).filter((p) => {
    if (typeof p?.id !== 'string' || !p.id.trim() || seen.has(p.id) ||
        !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 ||
        !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) return false;
    seen.add(p.id);
    return true;
  });
}

export const toCoordinate = (p) => [p.latitude, p.longitude];
