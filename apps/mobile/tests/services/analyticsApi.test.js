import { createAnalyticsApi } from '../../src/services/analyticsApi';
import { createApiClient } from '../../src/services/apiClient';
import { AnalyticsClient } from '../../src/features/privacy/AnalyticsClient';

const UUID = '3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c';

function fakeFetch(status) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) });
    return { status, ok: status >= 200 && status < 300, json: async () => ({ detail: 'session_revoked' }) };
  };
  return { impl, calls };
}
const api = (status, extra = {}) => {
  const f = fakeFetch(status);
  const client = createApiClient({ baseUrl: 'http://x/api', fetchImpl: f.impl });
  return { f, api: createAnalyticsApi({ client, useMock: false, ...extra }) };
};

describe('analyticsApi – nối UC12 với backend', () => {
  it('heartbeat gọi POST /v1/analytics/heartbeat với session_id', async () => {
    const { f, api: a } = api(204);
    await a.heartbeat(UUID);
    expect(f.calls).toEqual([{ url: 'http://x/api/v1/analytics/heartbeat', method: 'POST', body: { session_id: UUID } }]);
  });
  it('revoke gọi POST /v1/analytics/revoke', async () => {
    const { f, api: a } = api(204);
    await a.revoke(UUID);
    expect(f.calls[0].url).toBe('http://x/api/v1/analytics/revoke');
  });
  it('kiểu contract dùng /analytics', async () => {
    const { f, api: a } = api(204, { style: 'contract' });
    await a.heartbeat(UUID);
    expect(f.calls[0].url).toBe('http://x/api/analytics/heartbeat');
  });
  it('chế độ mock không gọi mạng', async () => {
    const f = fakeFetch(204);
    const client = createApiClient({ baseUrl: 'http://x/api', fetchImpl: f.impl });
    const a = createAnalyticsApi({ client, useMock: true });
    await a.heartbeat(UUID);
    await a.revoke(UUID);
    expect(f.calls).toHaveLength(0);
  });
  it('409 làm AnalyticsClient dừng gửi và xóa mã phiên', async () => {
    const { api: a } = api(409);
    const mem = new Map();
    const storage = { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => void mem.set(k, v), removeItem: async (k) => void mem.delete(k) };
    const c = new AnalyticsClient({ storage, api: a, randomId: () => UUID });
    await c.init();
    await c.grant();
    expect(await c.sendHeartbeat()).toBe(false);
    expect(c.consent).toBe('denied');
    expect(c.sessionId).toBeNull();
  });
  it('lỗi mạng khi rút: giữ yêu cầu chờ gửi lại', async () => {
    const client = createApiClient({ baseUrl: 'http://x/api', fetchImpl: async () => { throw new Error('offline'); } });
    const a = createAnalyticsApi({ client, useMock: false });
    const mem = new Map();
    const storage = { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => void mem.set(k, v), removeItem: async (k) => void mem.delete(k) };
    const c = new AnalyticsClient({ storage, api: a, randomId: () => UUID });
    await c.init();
    await c.grant();
    expect(await c.revoke()).toBe(false);
    expect(c.snapshot().hasPendingRevoke).toBe(true);
  });
});
