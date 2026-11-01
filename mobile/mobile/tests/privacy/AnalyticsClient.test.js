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
    await client.sendHeartbeat();
    expect(mem.has(K.sessionId)).toBe(false);
    expect(client.consent).toBe('denied');
  });
});
