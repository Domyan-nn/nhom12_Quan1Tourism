import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { NearMeError, formatDistance, hasCoords, haversineMeters, requestPosition, sortByDistance } from '../src/features/nearMe/nearMe.js';

// 0,001 độ vĩ ≈ 111 m. Gốc: Nhà thờ Đức Bà.
const ORIGIN = { latitude: 10.7798, longitude: 106.699 };
const at = (id, dLat, dLon = 0, extra = {}) => ({ id, name: id, latitude: ORIGIN.latitude + dLat, longitude: ORIGIN.longitude + dLon, ...extra });
const ids = (rows) => rows.map((r) => r.poi.id);

test('haversine: 0,001 độ vĩ ≈ 111 m, khoảng cách tới chính nó bằng 0', () => {
  const d = haversineMeters(10, 106, 10.001, 106);
  assert.ok(d > 110 && d < 112, String(d));
  assert.equal(haversineMeters(10.77, 106.69, 10.77, 106.69), 0);
});

test('hasCoords chỉ nhận số hữu hạn đúng miền, không ép chuỗi', () => {
  assert.equal(hasCoords({ latitude: 10.7, longitude: 106.7 }), true);
  for (const bad of [null, undefined, {}, { latitude: null, longitude: 1 }, { latitude: NaN, longitude: 1 },
    { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: '10.7', longitude: '106.7' }]) {
    assert.equal(hasCoords(bad), false, JSON.stringify(bad));
  }
});

test('sắp xếp tăng dần theo khoảng cách và kèm khoảng cách (mét)', () => {
  const rows = sortByDistance([at('xa', 0.01), at('gan', 0.001), at('giua', 0.003)], ORIGIN);
  assert.deepEqual(ids(rows), ['gan', 'giua', 'xa']);
  assert.ok(rows[0].distance_m > 100 && rows[0].distance_m < 120);
  assert.ok(rows[0].distance_m < rows[1].distance_m && rows[1].distance_m < rows[2].distance_m);
});

test('không sửa mảng gốc', () => {
  const list = [at('b', 0.01), at('a', 0.001)];
  const copy = JSON.stringify(list);
  sortByDistance(list, ORIGIN);
  assert.equal(JSON.stringify(list), copy);
  assert.deepEqual(list.map((p) => p.id), ['b', 'a']);
});

test('bằng khoảng cách thì giữ thứ tự cũ (ổn định)', () => {
  const rows = sortByDistance([at('thu-nhat', 0.002), at('thu-hai', 0.002), at('gan', 0.0005)], ORIGIN);
  assert.deepEqual(ids(rows), ['gan', 'thu-nhat', 'thu-hai']);
});

test('địa điểm thiếu hoặc hỏng tọa độ xếp cuối, giữ thứ tự cũ, không có khoảng cách', () => {
  const broken = [{ id: 'null', latitude: null, longitude: null }, { id: 'nan', latitude: NaN, longitude: 1 }, { id: 'str', latitude: '10.7', longitude: '106.7' }];
  const rows = sortByDistance([broken[0], at('xa', 0.01), broken[1], at('gan', 0.001), broken[2]], ORIGIN);
  assert.deepEqual(ids(rows), ['gan', 'xa', 'null', 'nan', 'str']);
  assert.deepEqual(rows.slice(2).map((r) => r.distance_m), [null, null, null]);
});

test('vị trí khách không hợp lệ: giữ nguyên thứ tự, không có khoảng cách', () => {
  const list = [at('b', 0.01), at('a', 0.001)];
  for (const origin of [null, undefined, {}, { latitude: 'x', longitude: 1 }, { latitude: 95, longitude: 0 }]) {
    const rows = sortByDistance(list, origin);
    assert.deepEqual(ids(rows), ['b', 'a']);
    assert.ok(rows.every((r) => r.distance_m === null));
  }
});

test('danh sách rỗng hoặc không phải mảng', () => {
  assert.deepEqual(sortByDistance([], ORIGIN), []);
  assert.deepEqual(sortByDistance(undefined, ORIGIN), []);
});

test('formatDistance: mét làm tròn 10, km một chữ số thập phân (dấu phẩy tiếng Việt)', () => {
  assert.equal(formatDistance(0), '< 10 m');
  assert.equal(formatDistance(9.9), '< 10 m');
  assert.equal(formatDistance(12), '~10 m');
  assert.equal(formatDistance(347), '~350 m');
  assert.equal(formatDistance(994), '~990 m');
  assert.equal(formatDistance(995), '1,0 km');
  assert.equal(formatDistance(1234), '1,2 km');
  assert.equal(formatDistance(1234, 'en'), '1.2 km');
  assert.equal(formatDistance(9999), '10 km');
  assert.equal(formatDistance(12345), '12 km');
});

test('formatDistance: giá trị không hợp lệ cho chuỗi rỗng', () => {
  for (const v of [null, undefined, NaN, Infinity, -5, '350']) assert.equal(formatDistance(v), '', String(v));
});

function fakeGeo(result) {
  const calls = [];
  return {
    calls,
    getCurrentPosition(ok, fail, options) {
      calls.push(options);
      setTimeout(() => ('error' in result ? fail({ code: result.error }) : ok({ coords: result.coords })), 0);
    },
  };
}

test('requestPosition: thành công trả vĩ độ và kinh độ, xin vị trí không cần độ chính xác cao', async () => {
  const geo = fakeGeo({ coords: { latitude: 10.77, longitude: 106.69, accuracy: 30 } });
  assert.deepEqual(await requestPosition({ geolocation: geo, secure: true }), { latitude: 10.77, longitude: 106.69 });
  assert.equal(geo.calls[0].enableHighAccuracy, false);
  assert.equal(geo.calls[0].timeout, 10_000);
});

test('requestPosition: ánh xạ mã lỗi của trình duyệt', async () => {
  for (const [code, expected] of [[1, 'DENIED'], [2, 'UNAVAILABLE'], [3, 'TIMEOUT'], [99, 'UNAVAILABLE']]) {
    await assert.rejects(requestPosition({ geolocation: fakeGeo({ error: code }), secure: true }),
      (e) => e instanceof NearMeError && e.code === expected, `mã ${code}`);
  }
});

test('requestPosition: không hỗ trợ, trang không an toàn, tọa độ hỏng', async () => {
  await assert.rejects(requestPosition({ geolocation: null, secure: true }), { code: 'UNSUPPORTED' });
  await assert.rejects(requestPosition({ geolocation: fakeGeo({ coords: { latitude: 1, longitude: 1 } }), secure: false }), { code: 'INSECURE' });
  await assert.rejects(requestPosition({ geolocation: fakeGeo({ coords: { latitude: NaN, longitude: 1 } }), secure: true }), { code: 'UNAVAILABLE' });
});

test('BR07: mã "Gần tôi" không gọi mạng và không ghi tọa độ vào bộ nhớ trình duyệt', () => {
  const dir = new URL('../src/features/nearMe/', import.meta.url);
  const forbidden = /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie/;
  for (const file of readdirSync(dir)) {
    const code = readFileSync(new URL(file, dir), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, forbidden, file);
  }
});
