import { readFileSync } from 'fs';
import path from 'path';
import { NearMeError, requestNearMePosition } from '../../src/features/places/nearMePosition';

const GOOD = { coords: { latitude: 10.7725, longitude: 106.698, accuracy: 20 } };
function fakeLocation(overrides = {}) {
  const calls = { permission: 0, services: 0, position: [] };
  return {
    calls,
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => { calls.permission += 1; return { granted: true }; },
    hasServicesEnabledAsync: async () => { calls.services += 1; return true; },
    getCurrentPositionAsync: async (options) => { calls.position.push(options); return GOOD; },
    ...overrides,
  };
}
const code = (promise) => promise.then(() => 'ok', (e) => (e instanceof NearMeError ? e.code : `lạ:${e?.message}`));

describe('requestNearMePosition', () => {
  it('thành công: trả vĩ độ và kinh độ, xin độ chính xác vừa phải', async () => {
    const location = fakeLocation();
    await expect(requestNearMePosition({ location })).resolves.toEqual({ latitude: 10.7725, longitude: 106.698 });
    expect(location.calls.position).toEqual([{ accuracy: 3 }]);
  });

  it('bị từ chối quyền: DENIED và không đọc vị trí', async () => {
    const location = fakeLocation({ requestForegroundPermissionsAsync: async () => ({ granted: false }) });
    expect(await code(requestNearMePosition({ location }))).toBe('DENIED');
    expect(location.calls.position).toHaveLength(0);
  });

  it('hỏi quyền bị lỗi: UNAVAILABLE', async () => {
    const location = fakeLocation({ requestForegroundPermissionsAsync: async () => { throw new Error('x'); } });
    expect(await code(requestNearMePosition({ location }))).toBe('UNAVAILABLE');
  });

  it('dịch vụ vị trí đang tắt: UNAVAILABLE và không đọc vị trí', async () => {
    const location = fakeLocation({ hasServicesEnabledAsync: async () => false });
    expect(await code(requestNearMePosition({ location }))).toBe('UNAVAILABLE');
    expect(location.calls.position).toHaveLength(0);
  });

  it('kiểm tra dịch vụ bị lỗi thì vẫn thử đọc vị trí', async () => {
    const location = fakeLocation({ hasServicesEnabledAsync: async () => { throw new Error('x'); } });
    await expect(requestNearMePosition({ location })).resolves.toEqual({ latitude: 10.7725, longitude: 106.698 });
  });

  it('đọc vị trí bị lỗi: UNAVAILABLE', async () => {
    const location = fakeLocation({ getCurrentPositionAsync: async () => { throw new Error('gps'); } });
    expect(await code(requestNearMePosition({ location }))).toBe('UNAVAILABLE');
  });

  it('tọa độ hỏng: UNAVAILABLE', async () => {
    for (const coords of [{ latitude: NaN, longitude: 1 }, { latitude: '10.7', longitude: '106.7' }, { latitude: 95, longitude: 0 }, undefined]) {
      const location = fakeLocation({ getCurrentPositionAsync: async () => ({ coords }) });
      expect(await code(requestNearMePosition({ location }))).toBe('UNAVAILABLE');
    }
  });

  it('chờ quá thời hạn: TIMEOUT, kết quả đến muộn bị bỏ', async () => {
    let late;
    const location = fakeLocation({ getCurrentPositionAsync: () => new Promise((resolve) => { late = resolve; }) });
    expect(await code(requestNearMePosition({ location, timeoutMs: 20 }))).toBe('TIMEOUT');
    late(GOOD); // không được gây lỗi chưa xử lý
    await new Promise((r) => setTimeout(r, 5));
  });

  it('dọn bộ đếm giờ khi thành công và khi lỗi', async () => {
    const cleared = [];
    const opts = { setTimeoutFn: () => 'timer', clearTimeoutFn: (t) => cleared.push(t) };
    await requestNearMePosition({ location: fakeLocation(), ...opts });
    await code(requestNearMePosition({ location: fakeLocation({ getCurrentPositionAsync: async () => { throw new Error('x'); } }), ...opts }));
    expect(cleared).toEqual(['timer', 'timer']);
  });
});

describe('BR07', () => {
  it('mã "Gần tôi" trên mobile không gọi mạng và không ghi tọa độ vào bộ nhớ máy', () => {
    for (const file of ['nearMe.js', 'nearMePosition.js', 'useNearMe.js']) {
      const code = readFileSync(path.resolve(process.cwd(), 'src/features/places', file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // bỏ chú thích, chỉ quét mã
      expect(code).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|AsyncStorage|SecureStore|localStorage|analytics/i);
    }
  });
});
