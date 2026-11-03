// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let mod; let fetchMock; let online; let dispose;
const init = () => { dispose = mod.initAnalytics(); };

function setVisible(v) {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
}
const calls = (path) => fetchMock.mock.calls.filter(([url]) => url.endsWith(path));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  localStorage.clear();
  setVisible('visible');
  online = true;
  Object.defineProperty(navigator, 'onLine', { get: () => online, configurable: true });
  fetchMock = vi.fn(async () => ({ ok: true, status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  mod = await import('./analyticsClient.js');
});
afterEach(() => { if (dispose) dispose(); dispose = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('BR13 – chỉ thu khi đồng ý', () => {
  it('chưa chọn: không tạo mã, không gửi gì', async () => {
    init();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mod.getSessionId()).toBeNull();
  });
  it('từ chối: không tạo mã, không gửi gì', async () => {
    init(); mod.declineConsent();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mod.getSessionId()).toBeNull();
    expect(mod.getConsent()).toBe('denied');
  });
});

describe('BR15 – heartbeat 30 giây', () => {
  it('đồng ý: tạo UUID, gửi ngay rồi mỗi 30 giây', async () => {
    init(); mod.grantConsent();
    expect(mod.getSessionId()).toMatch(UUID);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls('/heartbeat')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(calls('/heartbeat')).toHaveLength(4);
  });
  it('trang ẩn: không gửi; hiện lại: gửi ngay', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    setVisible('hidden');
    await vi.advanceTimersByTimeAsync(90_000);
    expect(calls('/heartbeat')).toHaveLength(1);
    setVisible('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(calls('/heartbeat')).toHaveLength(2);
  });
  it('mất mạng: không gửi', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    online = false;
    await vi.advanceTimersByTimeAsync(90_000);
    expect(calls('/heartbeat')).toHaveLength(1);
  });
});

describe('BR18 – rút đồng ý', () => {
  it('dừng gửi ngay và gọi revoke với đúng mã', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    const sid = mod.getSessionId();
    await mod.withdrawConsent();
    const before = calls('/heartbeat').length;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calls('/heartbeat')).toHaveLength(before);
    expect(JSON.parse(calls('/revoke')[0][1].body).session_id).toBe(sid);
    expect(mod.hasPendingRevoke()).toBe(false);
    expect(mod.getSessionId()).toBeNull();
  });
  it('UC12-E1: offline giữ mã chờ, có mạng thì gửi lại rồi xóa', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    online = false;
    await mod.withdrawConsent();
    expect(calls('/revoke')).toHaveLength(0);
    expect(mod.hasPendingRevoke()).toBe(true);
    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(calls('/revoke')).toHaveLength(1);
    expect(mod.hasPendingRevoke()).toBe(false);
  });
  it('server lỗi: giữ mã chờ', async () => {
    init(); mod.grantConsent();
    fetchMock.mockImplementation(async (url) => (url.endsWith('/revoke') ? { ok: false, status: 500 } : { ok: true, status: 204 }));
    await mod.withdrawConsent();
    expect(mod.hasPendingRevoke()).toBe(true);
  });
  it('khởi động lại với mã chờ: tự gửi lại revoke', async () => {
    localStorage.setItem('ss.analytics.pendingRevoke', '3f2b1c9e-8a44-4d51-9b0c-6a1f2e7d9c10');
    localStorage.setItem('ss.analytics.consent', 'denied');
    init();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls('/revoke')).toHaveLength(1);
    expect(mod.hasPendingRevoke()).toBe(false);
  });
  it('tab khác rút đồng ý -> tab này dừng ngay (sự kiện storage)', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    const before = calls('/heartbeat').length;
    localStorage.setItem('ss.analytics.consent', 'denied');
    localStorage.removeItem('ss.analytics.sid');
    window.dispatchEvent(new StorageEvent('storage', { key: 'ss.analytics.consent' }));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calls('/heartbeat')).toHaveLength(before);
  });
  it('server trả 409: xóa mã, chuyển sang từ chối, không gửi nữa', async () => {
    init();
    fetchMock.mockImplementation(async () => ({ ok: false, status: 409 }));
    mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    expect(mod.getSessionId()).toBeNull();
    expect(mod.getConsent()).toBe('denied');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calls('/heartbeat')).toHaveLength(1);
  });
});
