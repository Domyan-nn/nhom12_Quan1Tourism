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
afterEach(() => { if (dispose) dispose(); dispose = undefined; vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

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

describe('tích hợp, lỗi lưu trữ và phản hồi đến muộn', () => {
  it('dùng đúng base /api/v1, không ghép lặp /api', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/analytics/heartbeat');
    await mod.withdrawConsent();
    expect(calls('/revoke')[0][0]).toBe('/api/v1/analytics/revoke');
  });
  it('mock bị vô hiệu hóa: không sinh mã hoặc gửi cả yêu cầu rút đang chờ', async () => {
    localStorage.setItem('ss.analytics.pendingRevoke', '3f2b1c9e-8a44-4d51-9b0c-6a1f2e7d9c10');
    dispose = mod.initAnalytics({ enabled: false });
    expect(mod.grantConsent()).toBe(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mod.getSessionId()).toBeNull();
  });
  it('lỗi máy chủ được thử lại sau 30 giây dù mạng không đổi', async () => {
    init(); mod.grantConsent();
    fetchMock.mockImplementation(async () => ({ ok: false, status: 503 }));
    await mod.withdrawConsent();
    expect(mod.hasPendingRevoke()).toBe(true);
    fetchMock.mockImplementation(async () => ({ ok: true, status: 204 }));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls('/revoke')).toHaveLength(2);
    expect(mod.hasPendingRevoke()).toBe(false);
  });
  it('không đồng ý lại và ghi đè mã chờ rút khi offline', async () => {
    init(); mod.grantConsent();
    const sid = mod.getSessionId();
    online = false;
    await mod.withdrawConsent();
    expect(mod.grantConsent()).toBe(false);
    expect(localStorage.getItem('ss.analytics.pendingRevoke')).toBe(sid);
    expect(mod.getSessionId()).toBeNull();
  });
  it('phản hồi 409 của mã cũ không tắt lần đồng ý mới', async () => {
    let finish;
    fetchMock.mockImplementation((url) => url.endsWith('/heartbeat')
      ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve({ ok: true, status: 204 }));
    init(); mod.grantConsent();
    const old = mod.getSessionId();
    const finishOld = finish;
    await mod.withdrawConsent();
    mod.grantConsent();
    const current = mod.getSessionId();
    expect(current).not.toBe(old);
    finishOld({ ok: false, status: 409 });
    finish({ ok: true, status: 204 });
    await vi.advanceTimersByTimeAsync(0);
    expect(mod.getSessionId()).toBe(current);
    expect(mod.getConsent()).toBe('granted');
  });
  it('heartbeat chậm không tạo chồng nhiều request', async () => {
    let finish;
    fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calls('/heartbeat')).toHaveLength(1);
    finish({ ok: true, status: 204 });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls('/heartbeat')).toHaveLength(2);
  });
  it('xác nhận rút cũ không xóa yêu cầu mới từ tab khác', async () => {
    let finish;
    init(); mod.grantConsent();
    fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const withdrawing = mod.withdrawConsent();
    const other = 'a1b2c3d4-0000-4000-8000-000000000002';
    localStorage.setItem('ss.analytics.pendingRevoke', other);
    finish({ ok: true, status: 204 });
    await withdrawing;
    expect(localStorage.getItem('ss.analytics.pendingRevoke')).toBe(other);
    expect(mod.hasPendingRevoke()).toBe(true);
  });
  it('không gửi khi localStorage từ chối ghi', async () => {
    init();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage denied'); });
    expect(mod.grantConsent()).toBe(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mod.getConsent()).toBe('denied');
    expect(mod.getConsentError()).toBe('storageUnavailable');
  });
  it('đóng vòng đời ứng dụng dừng mọi heartbeat, khởi động lại hoạt động', async () => {
    init(); mod.grantConsent();
    await vi.advanceTimersByTimeAsync(0);
    dispose();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(calls('/heartbeat')).toHaveLength(1);
    init();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls('/heartbeat')).toHaveLength(2);
  });
});
