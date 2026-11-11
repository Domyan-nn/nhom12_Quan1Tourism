import { readFileSync } from 'fs';
import path from 'path';
import { formatDistance, hasCoords, sortByDistance } from '../../src/features/places/nearMe';

// 0,001 độ vĩ ≈ 111 m. Gốc: Nhà thờ Đức Bà. Các ca giống hệt apps/guest-web/tests/nearMe.test.js.
const ORIGIN = { latitude: 10.7798, longitude: 106.699 };
const at = (id, dLat, dLon = 0, extra = {}) => ({ id, name: id, latitude: ORIGIN.latitude + dLat, longitude: ORIGIN.longitude + dLon, ...extra });
const ids = (rows) => rows.map((r) => r.poi.id);

describe('hasCoords', () => {
  it('chỉ nhận số hữu hạn đúng miền, không ép chuỗi', () => {
    expect(hasCoords({ latitude: 10.7, longitude: 106.7 })).toBe(true);
    [null, undefined, {}, { latitude: null, longitude: 1 }, { latitude: NaN, longitude: 1 },
      { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: '10.7', longitude: '106.7' }]
      .forEach((bad) => expect(hasCoords(bad)).toBe(false));
  });
});

describe('sortByDistance', () => {
  it('sắp xếp tăng dần theo khoảng cách và kèm khoảng cách (mét)', () => {
    const rows = sortByDistance([at('xa', 0.01), at('gan', 0.001), at('giua', 0.003)], ORIGIN);
    expect(ids(rows)).toEqual(['gan', 'giua', 'xa']);
    expect(rows[0].distance_m).toBeGreaterThan(100);
    expect(rows[0].distance_m).toBeLessThan(120);
    expect(rows[0].distance_m).toBeLessThan(rows[1].distance_m);
    expect(rows[1].distance_m).toBeLessThan(rows[2].distance_m);
  });

  it('không sửa mảng gốc', () => {
    const list = [at('b', 0.01), at('a', 0.001)];
    const copy = JSON.stringify(list);
    sortByDistance(list, ORIGIN);
    expect(JSON.stringify(list)).toBe(copy);
    expect(list.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('bằng khoảng cách thì giữ thứ tự cũ (ổn định)', () => {
    const rows = sortByDistance([at('thu-nhat', 0.002), at('thu-hai', 0.002), at('gan', 0.0005)], ORIGIN);
    expect(ids(rows)).toEqual(['gan', 'thu-nhat', 'thu-hai']);
  });

  it('địa điểm thiếu hoặc hỏng tọa độ xếp cuối, giữ thứ tự cũ, không có khoảng cách', () => {
    const broken = [{ id: 'null', latitude: null, longitude: null }, { id: 'nan', latitude: NaN, longitude: 1 }, { id: 'str', latitude: '10.7', longitude: '106.7' }];
    const rows = sortByDistance([broken[0], at('xa', 0.01), broken[1], at('gan', 0.001), broken[2]], ORIGIN);
    expect(ids(rows)).toEqual(['gan', 'xa', 'null', 'nan', 'str']);
    expect(rows.slice(2).map((r) => r.distance_m)).toEqual([null, null, null]);
  });

  it('vị trí khách không hợp lệ: giữ nguyên thứ tự, không có khoảng cách', () => {
    const list = [at('b', 0.01), at('a', 0.001)];
    [null, undefined, {}, { latitude: 'x', longitude: 1 }, { latitude: 95, longitude: 0 }].forEach((origin) => {
      const rows = sortByDistance(list, origin);
      expect(ids(rows)).toEqual(['b', 'a']);
      expect(rows.every((r) => r.distance_m === null)).toBe(true);
    });
  });

  it('danh sách rỗng hoặc không phải mảng', () => {
    expect(sortByDistance([], ORIGIN)).toEqual([]);
    expect(sortByDistance(undefined, ORIGIN)).toEqual([]);
  });
});

describe('formatDistance', () => {
  it('mét làm tròn 10, km một chữ số thập phân (dấu phẩy tiếng Việt)', () => {
    expect(formatDistance(0)).toBe('< 10 m');
    expect(formatDistance(9.9)).toBe('< 10 m');
    expect(formatDistance(12)).toBe('~10 m');
    expect(formatDistance(347)).toBe('~350 m');
    expect(formatDistance(994)).toBe('~990 m');
    expect(formatDistance(995)).toBe('1,0 km');
    expect(formatDistance(1234)).toBe('1,2 km');
    expect(formatDistance(1234, 'en')).toBe('1.2 km');
    expect(formatDistance(9999)).toBe('10 km');
    expect(formatDistance(12345)).toBe('12 km');
  });

  it('giá trị không hợp lệ cho chuỗi rỗng', () => {
    [null, undefined, NaN, Infinity, -5, '350'].forEach((v) => expect(formatDistance(v)).toBe(''));
  });
});

describe('BR07', () => {
  it('mã "Gần tôi" không gọi mạng và không ghi tọa độ vào bộ nhớ máy', () => {
    const code = readFileSync(path.resolve(process.cwd(), 'src/features/places/nearMe.js'), 'utf8').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|AsyncStorage|SecureStore|localStorage/);
  });
});
