// UC02: chọn các địa điểm đủ điều kiện để vẽ marker. Một toạ độ hỏng (null, NaN, ngoài miền)
// làm react-native-maps lỗi cả bản đồ, nên loại riêng điểm đó thay vì để cả màn hình hỏng (NFR02).
import { hasValidCoords } from '../location/geo';

export function getMapMarkers(pois) {
  return (pois ?? []).filter((p) => p && p.id != null && hasValidCoords({ ...p, radius_m: p.radius_m ?? 1 }));
}

export const toCoordinate = (p) => ({ latitude: p.latitude, longitude: p.longitude });
