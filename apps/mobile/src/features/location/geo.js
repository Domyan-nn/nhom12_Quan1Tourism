// Tiện ích hình học cho geofencing (BR08). Hàm thuần, không phụ thuộc React Native.

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Khoảng cách đường tròn lớn (mét) giữa hai tọa độ. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Ngưỡng sai số GPS tối đa cho một POI: min(50 m, bán kính / 2). */
export function maxAccuracyFor(radiusM) {
  return Math.min(50, radiusM / 2);
}

/** Bán kính "ra vùng": bán kính + max(20 m, 0,2 × bán kính). */
export function exitRadiusFor(radiusM) {
  return radiusM + Math.max(20, 0.2 * radiusM);
}

export function hasValidCoords(poi) {
  return (
    poi != null &&
    Number.isFinite(poi.latitude) &&
    Number.isFinite(poi.longitude) &&
    Math.abs(poi.latitude) <= 90 &&
    Math.abs(poi.longitude) <= 180 &&
    Number.isFinite(poi.radius_m) &&
    poi.radius_m > 0
  );
}
