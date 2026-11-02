import { AutoPlayEngine, RULES } from '../../src/features/location/autoPlayEngine';
import { exitRadiusFor, haversineMeters, maxAccuracyFor } from '../../src/features/location/geo';

// ~0.00001 độ vĩ ≈ 1,11 m
const POI = (id, lat, lon, radius = 100, locales = ['vi']) => ({
  id, name: id, latitude: lat, longitude: lon, radius_m: radius,
  narrations: locales.map((l) => ({ locale: l, title: 't', body: 'b' })),
});
const A = POI('a', 10.7770, 106.6953, 100);
const T0 = 1_000_000_000_000;
const sample = (t, lat = 10.7770, lon = 106.6953, accuracy = 10) => ({ latitude: lat, longitude: lon, accuracy, timestamp: t });
const run = (eng, s, pois = [A], extra = {}) =>
  eng.evaluate({ sample: s, pois, locale: 'vi', now: s.timestamp, ...extra });

describe('geo', () => {
  it('haversine ~111 m cho 0,001 độ vĩ', () => {
    expect(haversineMeters(10, 106, 10.001, 106)).toBeGreaterThan(110);
    expect(haversineMeters(10, 106, 10.001, 106)).toBeLessThan(112);
  });
  it('ngưỡng sai số và bán kính ra vùng', () => {
    expect(maxAccuracyFor(100)).toBe(50);
    expect(maxAccuracyFor(60)).toBe(30);
    expect(exitRadiusFor(100)).toBe(120); // max(20, 20)
    expect(exitRadiusFor(80)).toBe(100); // max(20, 16)
    expect(exitRadiusFor(500)).toBe(600); // max(20, 100)
  });
});

describe('BR08 – mẫu hợp lệ', () => {
  it('bỏ mẫu cũ hơn 15 giây', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    const r = e.evaluate({ sample: sample(T0 + 5000), pois: [A], locale: 'vi', now: T0 + 5000 + 15_001 });
    expect(r.candidate).toBeNull();
    expect(r.distances.a).toBeUndefined();
  });
  it('bỏ mẫu từ tương lai quá 1 giây', () => {
    const e = new AutoPlayEngine();
    const r = e.evaluate({ sample: sample(T0 + 1500), pois: [A], locale: 'vi', now: T0 });
    expect(r.distances.a).toBeUndefined();
  });
  it('bỏ mẫu sai số vượt min(50, r/2); r=60 -> 30 m', () => {
    const e = new AutoPlayEngine();
    const small = POI('s', 10.7770, 106.6953, 60);
    expect(run(e, sample(T0, 10.7770, 106.6953, 31), [small]).distances.s).toBeUndefined();
    expect(run(e, sample(T0 + 1000, 10.7770, 106.6953, 30), [small]).distances.s).toBeDefined();
  });
  it('bỏ mẫu không có accuracy', () => {
    const e = new AutoPlayEngine();
    expect(run(e, { ...sample(T0), accuracy: null }).distances.a).toBeUndefined();
  });
});

describe('BR08 – xác nhận 5 giây', () => {
  it('chưa đủ 5 giây thì chưa phát; đủ 5 giây thì phát', () => {
    const e = new AutoPlayEngine();
    expect(run(e, sample(T0)).candidate).toBeNull();
    expect(run(e, sample(T0 + 4000)).candidate).toBeNull();
    expect(run(e, sample(T0 + RULES.DWELL_MS)).candidate?.id).toBe('a');
  });
  it('ra khỏi vùng làm mất tính liên tục', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    run(e, sample(T0 + 2000, 10.7790)); // ~222 m, ngoài vùng ra
    run(e, sample(T0 + 3000)); // vào lại
    expect(run(e, sample(T0 + 7000)).candidate).toBeNull(); // mới 4 s kể từ lần vào lại
    expect(run(e, sample(T0 + 8000)).candidate?.id).toBe('a');
  });
  it('vùng đệm (giữa bán kính và ngưỡng ra) giữ nguyên trạng thái', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    // 110 m: > 100 nhưng < 120 -> vẫn coi là đang ở trong
    const lat = 10.7770 + 110 / 111_195;
    run(e, sample(T0 + 3000, lat));
    expect(run(e, sample(T0 + 5000)).candidate?.id).toBe('a');
  });
  it('khe hở > 15 giây giữa các mẫu hợp lệ thì tính lại từ đầu', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    expect(run(e, sample(T0 + 20_000)).candidate).toBeNull();
    expect(run(e, sample(T0 + 25_000)).candidate?.id).toBe('a');
  });
  it('bật khi đã ở trong vùng vẫn phải đủ 5 giây (UC04-A1)', () => {
    const e = new AutoPlayEngine();
    expect(run(e, sample(T0)).candidate).toBeNull();
  });
});

describe('BR08 – điều kiện ứng viên', () => {
  it('không phát nếu thiếu bài ở ngôn ngữ đã chọn, không đổi sang ngôn ngữ khác', () => {
    const e = new AutoPlayEngine();
    const en = POI('e', 10.7770, 106.6953, 100, ['en']);
    run(e, sample(T0), [en]);
    expect(run(e, sample(T0 + 6000), [en]).candidate).toBeNull();
  });
  it('bỏ qua POI không công khai', () => {
    const e = new AutoPlayEngine();
    const hidden = { ...A, status: 'hidden' };
    run(e, sample(T0), [hidden]);
    expect(run(e, sample(T0 + 6000), [hidden]).candidate).toBeNull();
  });
  it('lọc ứng viên đủ điều kiện TRƯỚC rồi mới chọn gần nhất', () => {
    const e = new AutoPlayEngine();
    const near = POI('near', 10.7770, 106.6953, 100, ['en']); // gần hơn nhưng không có bài tiếng Việt
    const far = POI('far', 10.77725, 106.6953, 100, ['vi']); // ~28 m
    const pois = [near, far];
    run(e, sample(T0), pois);
    expect(run(e, sample(T0 + 6000), pois).candidate?.id).toBe('far');
  });
  it('chọn điểm gần nhất; đồng khoảng cách chọn theo mã ổn định', () => {
    const e = new AutoPlayEngine();
    const p1 = POI('b', 10.7770, 106.6953), p2 = POI('a', 10.7770, 106.6953);
    run(e, sample(T0), [p1, p2]);
    expect(run(e, sample(T0 + 6000), [p1, p2]).candidate?.id).toBe('a');
    const e2 = new AutoPlayEngine();
    const close = POI('z', 10.7770, 106.6953), distant = POI('a', 10.7772, 106.6953);
    run(e2, sample(T0), [close, distant]);
    expect(run(e2, sample(T0 + 6000), [close, distant]).candidate?.id).toBe('z');
  });
  it('không phát chồng khi đang phát', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    const r = run(e, sample(T0 + 6000), [A], { isPlaying: true });
    expect(r.candidate).toBeNull();
    expect(r.reason).toBe('ALREADY_PLAYING');
  });
});

describe('BR08 – chờ 600 giây và phát lại', () => {
  const OUT = 10.7790;
  it('đã phát thành công thì không phát lại khi vẫn đứng trong vùng', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    expect(run(e, sample(T0 + 5000)).candidate?.id).toBe('a');
    e.recordPlaySuccess('a', T0 + 5000);
    expect(run(e, sample(T0 + 700_000)).candidate).toBeNull();
  });
  it('ra rồi vào lại SỚM hơn 600 giây thì không phát', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    run(e, sample(T0 + 5000));
    e.recordPlaySuccess('a', T0 + 5000);
    run(e, sample(T0 + 10_000, OUT));
    run(e, sample(T0 + 300_000));
    expect(run(e, sample(T0 + 310_000)).candidate).toBeNull();
  });
  it('ra rồi vào lại SAU >= 600 giây thì được phát lại', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    run(e, sample(T0 + 5000));
    e.recordPlaySuccess('a', T0 + 5000);
    run(e, sample(T0 + 10_000, OUT));
    run(e, sample(T0 + 605_000));
    expect(run(e, sample(T0 + 610_000)).candidate?.id).toBe('a');
  });
  it('phát lỗi (không recordPlaySuccess) thì vẫn là ứng viên (UC04-E2)', () => {
    const e = new AutoPlayEngine();
    run(e, sample(T0));
    expect(run(e, sample(T0 + 5000)).candidate?.id).toBe('a');
    expect(run(e, sample(T0 + 6000)).candidate?.id).toBe('a');
  });
});
