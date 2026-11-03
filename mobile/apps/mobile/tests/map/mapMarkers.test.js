import { getMapMarkers, toCoordinate } from '../../src/features/map/mapMarkers';

const P = (id, lat, lon, extra = {}) => ({ id, name: id, latitude: lat, longitude: lon, ...extra });

describe('UC02 – marker bản đồ', () => {
  it('giữ điểm có toạ độ hợp lệ, kể cả khi danh sách không có radius_m', () => {
    expect(getMapMarkers([P('a', 10.77, 106.69)])).toHaveLength(1);
  });
  it('loại điểm toạ độ hỏng để không làm lỗi cả bản đồ', () => {
    const list = [P('ok', 10.77, 106.69), P('n', null, 106.69), P('nan', NaN, 1), P('out', 91, 106), P('lon', 10, 181), P('str', '10.7', '106.7')];
    expect(getMapMarkers(list).map((p) => p.id)).toEqual(['ok']);
  });
  it('chịu được danh sách rỗng hoặc undefined', () => {
    expect(getMapMarkers([])).toEqual([]);
    expect(getMapMarkers(undefined)).toEqual([]);
  });
  it('toCoordinate chỉ lấy vĩ độ và kinh độ', () => {
    expect(toCoordinate(P('a', 1, 2, { name: 'x' }))).toEqual({ latitude: 1, longitude: 2 });
  });
});
