import { loadFreshDetail } from '../../src/features/location/freshDetail';

const fail = (status, code) => Object.assign(new Error(code), { status, code });

describe('loadFreshDetail (UC04, BR01)', () => {
  it('luôn hỏi lại server trước khi tự phát', async () => {
    const getDetail = jest.fn().mockResolvedValue({ id: 'a', narrations: [] });
    await expect(loadFreshDetail(getDetail, 'a')).resolves.toEqual({ id: 'a', narrations: [] });
    expect(getDetail).toHaveBeenCalledTimes(1);
    expect(getDetail).toHaveBeenCalledWith('a', { force: true });
  });
  it('POI vừa bị ẩn: ném 404, không dùng bản cũ trong bộ nhớ', async () => {
    const getDetail = jest.fn().mockRejectedValue(fail(404, 'POI_NOT_FOUND'));
    await expect(loadFreshDetail(getDetail, 'a')).rejects.toMatchObject({ status: 404 });
    expect(getDetail).toHaveBeenCalledTimes(1);
  });
  it('mất mạng: dùng bản đã tải nếu có (NFR02)', async () => {
    const cached = { id: 'a', narrations: [{ locale: 'vi', title: 't', body: 'b' }] };
    const getDetail = jest.fn()
      .mockRejectedValueOnce(fail(0, 'NETWORK_ERROR'))
      .mockResolvedValueOnce(cached);
    await expect(loadFreshDetail(getDetail, 'a')).resolves.toBe(cached);
    expect(getDetail).toHaveBeenLastCalledWith('a');
  });
});
