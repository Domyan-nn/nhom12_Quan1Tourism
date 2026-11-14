// "Gần tôi" (mobile): xin vị trí MỘT lần bằng expo-location. Module expo-location được tiêm vào
// để kiểm thử mà không cần thiết bị. BR07: chỉ trả tọa độ cho hook giữ trong bộ nhớ; không ghi đĩa, không gửi đi.
import { hasCoords } from './nearMe';

export class NearMeError extends Error {
  constructor(code) {
    super(code);
    this.name = 'NearMeError';
    this.code = code; // DENIED | UNAVAILABLE | TIMEOUT
  }
}

export const NEAR_ME_TIMEOUT_MS = 10_000;

export async function requestNearMePosition({
  location,
  timeoutMs = NEAR_ME_TIMEOUT_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let permission;
  try {
    permission = await location.requestForegroundPermissionsAsync();
  } catch {
    throw new NearMeError('UNAVAILABLE');
  }
  if (!permission?.granted) throw new NearMeError('DENIED');

  if (typeof location.hasServicesEnabledAsync === 'function') {
    let enabled = true;
    try {
      enabled = await location.hasServicesEnabledAsync();
    } catch {
      /* không kiểm tra được thì cứ thử đọc vị trí */
    }
    if (enabled === false) throw new NearMeError('UNAVAILABLE'); // GPS/dịch vụ vị trí đang tắt
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeoutFn(() => reject(new NearMeError('TIMEOUT')), timeoutMs);
  });
  try {
    // Độ chính xác vừa phải là đủ để sắp thứ tự và đỡ tốn pin.
    const position = await Promise.race([location.getCurrentPositionAsync({ accuracy: location.Accuracy?.Balanced }), timeout]);
    const origin = { latitude: position?.coords?.latitude, longitude: position?.coords?.longitude };
    if (!hasCoords(origin)) throw new NearMeError('UNAVAILABLE');
    return origin;
  } catch (error) {
    throw error instanceof NearMeError ? error : new NearMeError('UNAVAILABLE');
  } finally {
    clearTimeoutFn(timer);
  }
}
