// Phần mở rộng B "Gần tôi" (mobile): sắp xếp danh sách địa điểm theo khoảng cách tới khách.
// BR07: tính hoàn toàn trên máy bằng haversine; KHÔNG gửi tọa độ lên server, KHÔNG ghi xuống bộ nhớ máy.
// Hàm thuần; hành vi giống hệt apps/guest-web/src/features/nearMe/nearMe.js.
// Nút "Gần tôi" và việc xin vị trí (expo-location) làm ở ExploreScreen, ngày sau.
import { haversineMeters } from '../location/geo';

/** Tọa độ hợp lệ: số hữu hạn đúng miền. Chuỗi như '10.7' bị loại, không ép kiểu ngầm. */
export function hasCoords(p) {
  return (
    p != null &&
    typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
    typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
  );
}

/**
 * Sắp xếp theo khoảng cách tăng dần. Không sửa mảng gốc.
 * - Bằng khoảng cách thì giữ thứ tự cũ (ổn định).
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
