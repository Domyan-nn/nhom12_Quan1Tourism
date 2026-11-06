import { AnalyticsClient, ANALYTICS_STORAGE_KEYS as K } from '../../src/features/privacy/AnalyticsClient';

function setup({ failRevoke = false } = {}) {
  const mem = new Map();
  const storage = {
    getItem: async (k) => mem.get(k) ?? null,
    setItem: async (k, v) => void mem.set(k, v),
    removeItem: async (k) => void mem.delete(k),
  };
  const calls = { heartbeat: [], revoke: [] };
  const state = { failRevoke };
  const api = {
    heartbeat: async (id) => { calls.heartbeat.push(id); },
    revoke: async (id) => { calls.revoke.push(id); if (state.failRevoke) throw new Error('offline'); },
  };
  let n = 0;
  const timers = [];
  const client = new AnalyticsClient({
    storage, api, randomId: () => `id-${++n}`,
    setIntervalFn: (fn) => { timers.push(fn); return timers.length; },
    clearIntervalFn: (h) => { timers[h - 1] = null; },
  });
  return { client, mem, calls, state, timers };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('UC12 – quyền riêng tư', () => {
  it('chưa chọn hoặc từ chối: không tạo mã, không gọi API (BR13)', async () => {
    const { client, calls, mem } = setup();
    await client.init();
    client.setRunning(true);
    await client.decline();
    client.setRunning(true);
    await tick();
    expect(calls.heartbeat).toHaveLength(0);
    expect(mem.has(K.sessionId)).toBe(false);
    expect(mem.get(K.consent)).toBe('denied');
  });

  it('đồng ý: tạo mã, gửi heartbeat ngay khi hiển thị + có mạng', async () => {
    const { client, calls } = setup();
    await client.init();
    await client.grant();
    expect(calls.heartbeat).toHaveLength(0);
    client.setRunning(true);
    await tick();
    expect(calls.heartbeat).toEqual(['id-1']);
  });

  it('ẩn ứng dụng / mất mạng: dừng gửi (BR15)', async () => {
    const { client, timers } = setup();
    await client.init();
    await client.grant();
    client.setRunning(true);
    expect(timers.filter(Boolean)).toHaveLength(1);
    client.setRunning(false);
    expect(timers.filter(Boolean)).toHaveLength(0);
  });

  it('rút đồng ý thành công: dừng ngay, xóa mã, gọi revoke', async () => {
    const { client, calls, mem, timers } = setup();
    await client.init();
    await client.grant();
    client.setRunning(true);
    await client.revoke();
    expect(timers.filter(Boolean)).toHaveLength(0);
    expect(calls.revoke).toEqual(['id-1']);
    expect(mem.has(K.sessionId)).toBe(false);
    expect(mem.has(K.pendingRevoke)).toBe(false);
    expect(client.consent).toBe('denied');
  });

  it('rút khi mất mạng: dừng gửi, giữ mã, thử lại thành công khi có mạng (UC12-E1)', async () => {
    const { client, calls, mem, state } = setup({ failRevoke: true });
    await client.init();
    await client.grant();
    client.setRunning(true);
    await tick();
    const beats = calls.heartbeat.length;
    await client.revoke();
    expect(mem.get(K.pendingRevoke)).toBe('id-1');
    await client.sendHeartbeat();
    expect(calls.heartbeat.length).toBe(beats);
    state.failRevoke = false;
    client.setRunning(true);
    await tick();
    expect(mem.has(K.pendingRevoke)).toBe(false);
  });

  it('khôi phục lựa chọn và yêu cầu rút đang chờ sau khi mở lại ứng dụng', async () => {
    const a = setup({ failRevoke: true });
    await a.client.init();
    await a.client.grant();
    await a.client.revoke();
    const b = new AnalyticsClient({ storage: a.client.storage, api: a.client.api, randomId: () => 'x' });
    await b.init();
    expect(b.consent).toBe('denied');
    expect(b.pendingRevoke).toBe('id-1');
  });

  it('server trả 409 SESSION_REVOKED: dừng và xóa mã', async () => {
    const { client, mem } = setup();
    client.api.heartbeat = async () => { throw Object.assign(new Error('r'), { status: 409, code: 'SESSION_REVOKED' }); };
    await client.init();
    await client.grant();
    client.setRunning(true);
    await client.sendHeartbeat();
    await tick();
    expect(mem.has(K.sessionId)).toBe(false);
    expect(client.consent).toBe('denied');
  });

  it('không đồng ý lại khi yêu cầu rút còn chờ, không làm mất mã cũ', async () => {
    const { client, calls, mem } = setup({ failRevoke: true });
    await client.init();
    await client.grant();
    await client.revoke();
    expect(await client.grant()).toBe(false);
    expect(client.consent).toBe('denied');
    expect(mem.get(K.pendingRevoke)).toBe('id-1');
    expect(mem.has(K.sessionId)).toBe(false);
    expect(calls.heartbeat).toHaveLength(0);
  });

  it('thử lại yêu cầu rút mỗi 30 giây khi vẫn online/foreground', async () => {
    const { client, timers, state, mem } = setup({ failRevoke: true });
    await client.init();
    await client.grant();
    client.setRunning(true);
    await client.revoke();
    expect(timers.filter(Boolean)).toHaveLength(1);
    state.failRevoke = false;
    timers.find(Boolean)();
    await tick();
    expect(mem.has(K.pendingRevoke)).toBe(false);
    expect(timers.filter(Boolean)).toHaveLength(0);
  });

  it('heartbeat đã xếp hàng không gửi sau khi ứng dụng ẩn', async () => {
    const { client, calls } = setup();
    await client.init();
    await client.grant();
    client.setRunning(true);
    await tick();
    client.setRunning(false);
    const count = calls.heartbeat.length;
    expect(await client.sendHeartbeat()).toBe(false);
    expect(calls.heartbeat).toHaveLength(count);
  });

  it('không chồng heartbeat và không xóa phiên mới khi response cũ trả 409', async () => {
    const { client, calls, mem } = setup();
    let rejectBeat;
    client.api.heartbeat = (id) => {
      calls.heartbeat.push(id);
      return new Promise((_, reject) => { rejectBeat = reject; });
    };
    await client.init();
    await client.grant();
    client.setRunning(true);
    await client.sendHeartbeat();
    expect(calls.heartbeat).toEqual(['id-1']);
    await client.revoke();
    client.setRunning(false);
    await client.grant();
    rejectBeat({ status: 409 });
    await tick();
    expect(client.consent).toBe('granted');
    expect(mem.get(K.sessionId)).toBe('id-2');
  });

  it('mở lại giữa chừng rút: pending thắng lựa chọn granted cũ', async () => {
    const { client, mem, calls } = setup({ failRevoke: true });
    mem.set(K.consent, 'granted');
    mem.set(K.sessionId, 'old');
    mem.set(K.pendingRevoke, 'old');
    await client.init();
    client.setRunning(true);
    await tick();
    expect(client.consent).toBe('denied');
    expect(calls.heartbeat).toHaveLength(0);
  });

  it('lưu pending trước khi xóa session; lưu trữ lỗi thì dừng an toàn', async () => {
    const { client, mem, calls } = setup();
    await client.init();
    await client.grant();
    const originalSet = client.storage.setItem;
    client.storage.setItem = async (key, value) => {
      if (key === K.pendingRevoke) throw new Error('storage unavailable');
      await originalSet(key, value);
    };
    expect(await client.revoke()).toBe(false);
    expect(mem.get(K.sessionId)).toBe('id-1');
    expect(client.snapshot().storageError).toBe(true);
    expect(calls.heartbeat).toHaveLength(0);
  });

  it('rút trong lúc đang lưu đồng ý không bị ghi đè hoặc gửi heartbeat muộn', async () => {
    const { client, mem, calls } = setup({ failRevoke: true });
    let resume;
    const write = client.storage.setItem;
    client.storage.setItem = async (key, value) => {
      if (key === K.sessionId) await new Promise((resolve) => { resume = resolve; });
      await write(key, value);
    };
    await client.init();
    client.setRunning(true);
    const grant = client.grant();
    await tick();
    const revoke = client.revoke();
    resume();
    expect(await grant).toBe(false);
    expect(await revoke).toBe(false);
    expect(mem.get(K.consent)).toBe('denied');
    expect(mem.has(K.sessionId)).toBe(false);
    expect(mem.get(K.pendingRevoke)).toBe('id-1');
    expect(calls.heartbeat).toHaveLength(0);
    client.setRunning(false);
  });

  it('đọc lựa chọn lỗi: khởi tạo hoàn tất, không tạo mã hoặc gửi thống kê', async () => {
    const { client, calls, timers } = setup();
    client.storage.getItem = async () => { throw new Error('storage unavailable'); };
    await client.init();
    client.setRunning(true);
    expect(await client.grant()).toBe(false);
    expect(client.snapshot().storageError).toBe(true);
    expect(calls.heartbeat).toHaveLength(0);
    expect(timers.filter(Boolean)).toHaveLength(0);
  });

  it('lựa chọn cũ thiếu mã phiên yêu cầu chọn lại và không tự tạo mã', async () => {
    const { client, mem, calls } = setup();
    mem.set(K.consent, 'granted');
    await client.init();
    client.setRunning(true);
    expect(client.snapshot().consent).toBeNull();
    expect(mem.has(K.sessionId)).toBe(false);
    expect(calls.heartbeat).toHaveLength(0);
  });

  it('lưu đồng ý thất bại giữ trạng thái chưa chọn để hiển thị lỗi, không gửi thống kê', async () => {
    const { client, calls } = setup();
    await client.init();
    client.storage.setItem = async () => { throw new Error('storage unavailable'); };
    client.setRunning(true);
    expect(await client.grant()).toBe(false);
    expect(client.snapshot()).toMatchObject({ consent: null, storageError: true, hasPendingRevoke: false });
    expect(client.sessionId).toBeNull();
    expect(calls.heartbeat).toHaveLength(0);
  });

  it('lỗi lưu đồng ý cũ không hoàn tác lựa chọn rút mới hoặc làm mất mã chờ', async () => {
    const { client, mem } = setup({ failRevoke: true });
    const originalSet = client.storage.setItem;
    let rejectWrite;
    client.storage.setItem = async (key, value) => {
      if (key === K.sessionId) await new Promise((_, reject) => { rejectWrite = reject; });
      await originalSet(key, value);
    };
    await client.init();
    const grant = client.grant();
    await tick();
    const revoke = client.revoke();
    rejectWrite(new Error('storage unavailable'));
    expect(await grant).toBe(false);
    expect(await revoke).toBe(false);
    expect(client.snapshot()).toMatchObject({ consent: 'denied', storageError: true, hasPendingRevoke: true });
    expect(client.pendingRevoke).toBe('id-1');
    expect(mem.get(K.pendingRevoke)).toBe('id-1');
  });

  it('khởi động mock giữ yêu cầu rút từ API thật tới khi mở lại chế độ thật và có xác nhận', async () => {
    const a = setup({ failRevoke: true });
    await a.client.init();
    await a.client.grant();
    await a.client.revoke();
    const api = { heartbeat: jest.fn(), revoke: jest.fn() };
    const randomId = jest.fn();
    const mock = new AnalyticsClient({ storage: a.client.storage, api, randomId, enabled: false });
    await mock.init();
    mock.setRunning(true);
    expect(await mock.grant()).toBe(false);
    expect(await mock.flushRevoke()).toBe(false);
    expect(await mock.sendHeartbeat()).toBe(false);
    expect(mock.running).toBe(false);
    expect(a.mem.get(K.pendingRevoke)).toBe('id-1');
    expect(randomId).not.toHaveBeenCalled();
    expect(api.heartbeat).not.toHaveBeenCalled();
    expect(api.revoke).not.toHaveBeenCalled();
    a.state.failRevoke = false;
    const real = new AnalyticsClient({ storage: a.client.storage, api: a.client.api, randomId: () => 'new' });
    await real.init();
    expect(await real.flushRevoke()).toBe(true);
    expect(a.mem.has(K.pendingRevoke)).toBe(false);
  });

  it('mock chưa chọn không tạo mã; từ chối vẫn cho dùng nội dung công khai', async () => {
    const a = setup();
    const randomId = jest.fn();
    const mock = new AnalyticsClient({ storage: a.client.storage, api: a.client.api, randomId, enabled: false });
    await mock.init();
    mock.setRunning(true);
    expect(await mock.grant()).toBe(false);
    expect(await mock.decline()).toBe(true);
    expect(mock.snapshot().consent).toBe('denied');
    expect(randomId).not.toHaveBeenCalled();
    expect(a.calls.heartbeat).toHaveLength(0);
    expect(a.mem.has(K.sessionId)).toBe(false);
  });
});
