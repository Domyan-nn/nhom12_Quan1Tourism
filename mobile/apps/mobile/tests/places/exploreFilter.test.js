import { filterPois, normalizeText } from '../../src/services/publicApi';

const P = (id, name, cat) => ({ id, name, category_id: cat });
const LIST = [
  P('1', 'Dinh Độc Lập', 'c1'),
  P('2', 'Nhà thờ Đức Bà', 'c1'),
  P('3', 'Chợ Bến Thành', 'c2'),
];

describe('UC01 – tìm và lọc (BR02)', () => {
  it('không phân biệt hoa/thường và cắt khoảng trắng', () => {
    expect(filterPois(LIST, { q: '  CHỢ ' }).map((p) => p.id)).toEqual(['3']);
  });
  it('khớp chuỗi con có dấu', () => {
    expect(filterPois(LIST, { q: 'đức' }).map((p) => p.id)).toEqual(['2']);
  });
  it('chuẩn hóa Unicode NFC: chuỗi tổ hợp (NFD) vẫn khớp', () => {
    const nfd = 'Bến'.normalize('NFD');
    expect(nfd).not.toBe('Bến');
    expect(filterPois(LIST, { q: nfd }).map((p) => p.id)).toEqual(['3']);
    expect(normalizeText(nfd)).toBe(normalizeText('Bến'));
  });
  it('lọc theo danh mục và kết hợp với từ khóa', () => {
    expect(filterPois(LIST, { categoryId: 'c1' }).map((p) => p.id)).toEqual(['1', '2']);
    expect(filterPois(LIST, { categoryId: 'c1', q: 'thờ' }).map((p) => p.id)).toEqual(['2']);
    expect(filterPois(LIST, { categoryId: 'c2', q: 'thờ' })).toEqual([]);
  });
  it('không có kết quả -> mảng rỗng (UC01-E1)', () => {
    expect(filterPois(LIST, { q: 'không-tồn-tại' })).toEqual([]);
  });
  it('không điều kiện -> trả đủ danh sách', () => {
    expect(filterPois(LIST, {})).toHaveLength(3);
  });
});
