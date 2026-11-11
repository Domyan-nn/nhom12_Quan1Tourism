// Phần mở rộng B "Gần tôi": sắp xếp danh sách địa điểm theo khoảng cách tới khách.
// BR07: mọi phép tính chạy trên máy khách (haversine). Tọa độ của khách không được gửi lên server,
// không lưu vào localStorage/cookie, chỉ nằm trong bộ nhớ của trang khi khách đang bật "Gần tôi".
// Hàm thuần, không phụ thuộc React; logic giống hệt apps/mobile/src/features/places/nearMe.js.

const EARTH_RADIUS_M = 6371008.8; // cùng hằng số với apps/mobile/src/features/location/geo.js
const toRad = (deg) => (deg * Math.PI) / 180;

/** Khoảng cách đường tròn lớn (mét) giữa hai tọa độ. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Tọa độ hợp lệ: số hữu hạn, đúng miền. Chuỗi như '10.7' bị loại, không ép kiểu ngầm. */
export function hasCoords(p) {
  return (
    p != null &&
    typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
    typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
  );
}

/**
 * Sắp xếp theo khoảng cách tăng dần. Không sửa mảng gốc.
 * - Địa điểm bằng khoảng cách giữ thứ tự cũ (sắp xếp ổn định).
 * - Địa điểm thiếu/hỏng tọa độ xếp cuối, giữ thứ tự cũ, không có khoảng cách.
 * - Vị trí khách không hợp lệ: giữ nguyên thứ tự, không có khoảng cách nào.
 * @returns {{poi: object, distance_m: number|null}[]}
 */
export function sortByDistance(pois, origin) {
  const list = Array.isArray(pois) ? pois : [];
  if (!hasCoords(origin)) return list.map((poi) => ({ poi, distance_m: null }));
  const rows = list.map((poi, index) => ({
    poi,
    index,
    distance_m: hasCoords(poi) ? haversineMeters(origin.latitude, origin.longitude, poi.latitude, poi.longitude) : null,
  }));
  rows.sort((a, b) => {
    if (a.distance_m === null && b.distance_m === null) return a.index - b.index;
    if (a.distance_m === null) return 1;
    if (b.distance_m === null) return -1;
    return a.distance_m - b.distance_m || a.index - b.index;
  });
  return rows.map(({ poi, distance_m }) => ({ poi, distance_m }));
}

/** "~350 m" (làm tròn 10 m), "1,2 km" (một chữ số thập phân dưới 10 km), "12 km" từ 10 km. */
export function formatDistance(meters, language = 'vi') {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) return '';
  const point = language === 'en' ? '.' : ',';
  if (meters < 10) return '< 10 m';
  if (meters < 995) return `~${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  const oneDecimal = Math.round(km * 10) / 10;
  return `${oneDecimal < 10 ? oneDecimal.toFixed(1).replace('.', point) : Math.round(km)} km`;
}

export class NearMeError extends Error {
  constructor(code) {
    super(code);
    this.name = 'NearMeError';
    this.code = code; // UNSUPPORTED | INSECURE | DENIED | UNAVAILABLE | TIMEOUT
  }
}

/** Xin vị trí một lần. Tham số được tiêm vào để kiểm thử mà không cần trình duyệt. */
export function requestPosition({
  geolocation = globalThis.navigator?.geolocation,
  secure = globalThis.isSecureContext !== false,
  timeoutMs = 10_000,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!geolocation) return reject(new NearMeError('UNSUPPORTED'));
    if (!secure) return reject(new NearMeError('INSECURE')); // trình duyệt chỉ định vị trên HTTPS/localhost
    geolocation.getCurrentPosition(
      (pos) => {
        const origin = { latitude: pos?.coords?.latitude, longitude: pos?.coords?.longitude };
        if (hasCoords(origin)) resolve(origin);
        else reject(new NearMeError('UNAVAILABLE'));
      },
      (err) => reject(new NearMeError(err?.code === 1 ? 'DENIED' : err?.code === 3 ? 'TIMEOUT' : 'UNAVAILABLE')),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
