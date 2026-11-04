// Lõi thống kê ẩn danh phía khách (UC12, WBS-08). Không phụ thuộc React.
// BR13: chỉ tạo mã và gửi tín hiệu sau khi khách đồng ý.
// BR15: heartbeat mỗi 30 giây khi trang đang hiển thị và có mạng.
// BR18: rút đồng ý -> dừng gửi ngay ở mọi tab cùng nguồn, giữ mã chờ để gửi lại yêu cầu rút.

const KEY_CONSENT = 'ss.analytics.consent'; // 'granted' | 'denied' (không có = chưa chọn)
const KEY_SID = 'ss.analytics.sid';
const KEY_PENDING = 'ss.analytics.pendingRevoke';
const HEARTBEAT_MS = 30_000;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

const listeners = new Set();
let timer = null;
let started = false;
let enabled = true;
let retryTimer = null;
let clientError = null;
let memoryPending = null;
let revoking = null;
const heartbeats = new Set();

function read(key) {
  try { return window.localStorage.getItem(key); } catch { clientError = 'storageUnavailable'; return null; }
}
function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch { clientError = 'storageUnavailable'; return false; }
}

export function getConsent() {
  const v = read(KEY_CONSENT);
  if (clientError) return 'denied'; // fail closed if a choice cannot be persisted
  return v === 'granted' || v === 'denied' ? v : 'unset';
}
export function getSessionId() { return read(KEY_SID); }
export function hasPendingRevoke() { return !!(memoryPending || read(KEY_PENDING)); }
export function getConsentError() { return clientError; }

function notify() { listeners.forEach((fn) => fn()); }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function newSessionId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  // Dự phòng cho trình duyệt cũ: UUID v4 từ getRandomValues
  const b = window.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function post(path, sessionId) {
  return fetch(`${API_BASE}/analytics/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
    keepalive: true,
  });
}

const canSend = () =>
  enabled && !clientError && getConsent() === 'granted' && !!getSessionId() &&
  document.visibilityState === 'visible' && navigator.onLine;

async function tick() {
  if (!canSend()) return;
  const sid = getSessionId();
  if (heartbeats.has(sid)) return; // slow requests must not accumulate
  heartbeats.add(sid);
  try {
    const res = await post('heartbeat', sid);
    if (res.status === 409 && getSessionId() === sid) { // ignore responses for an older grant
      write(KEY_SID, null);
      write(KEY_CONSENT, 'denied');
      evaluate();
    }
  } catch { /* mất mạng: bỏ qua, lần sau gửi lại */ }
  finally { heartbeats.delete(sid); }
}

function startLoop() {
  if (timer) return;
  tick();
  timer = setInterval(tick, HEARTBEAT_MS);
}
function stopLoop() {
  if (timer) { clearInterval(timer); timer = null; }
}

// Đồng bộ vòng lặp với trạng thái đồng ý hiện tại; gọi mỗi khi trạng thái đổi.
function evaluate() {
  if (canSend()) startLoop();
  else stopLoop();
  notify();
}

export async function flushPendingRevoke() {
  const pending = memoryPending || read(KEY_PENDING);
  if (!enabled || !pending || !navigator.onLine) return;
  if (revoking) return revoking;
  revoking = (async () => {
    try {
      const res = await post('revoke', pending);
      if (res.ok) {
        // A late response must never erase a newer pending withdrawal.
        if (read(KEY_PENDING) === pending) write(KEY_PENDING, null);
        if (memoryPending === pending) memoryPending = null;
      }
    } catch { /* giữ mã chờ, thử lại sau */ }
    finally { revoking = null; notify(); }
  })();
  return revoking;
}

export function grantConsent() {
  if (!enabled || hasPendingRevoke() || clientError) return false;
  let sid = getSessionId();
  if (!sid) {
    try { sid = newSessionId(); }
    catch { clientError = 'secureIdUnavailable'; notify(); return false; }
  }
  // Persist the identifier before granting; never send an unpersisted session.
  if (!write(KEY_SID, sid) || !write(KEY_CONSENT, 'granted')) {
    stopLoop(); notify(); return false;
  }
  evaluate();
  return true;
}

export function declineConsent() {
  if (getSessionId()) return withdrawConsent();
  write(KEY_CONSENT, 'denied');
  write(KEY_SID, null); // từ chối: không tạo mã, không gửi gì
  evaluate();
}

export function withdrawConsent() {
  stopLoop();
  const sid = getSessionId();
  if (sid) {
    memoryPending = sid;
    write(KEY_PENDING, sid); // lưu mã chờ TRƯỚC khi xóa mã đang dùng
  }
  write(KEY_CONSENT, 'denied');
  write(KEY_SID, null);
  evaluate(); // dừng gửi ngay
  return flushPendingRevoke();
}

// Gọi một lần khi ứng dụng khởi động.
export function initAnalytics({ enabled: allowAnalytics = true } = {}) {
  if (started) return () => {};
  started = true;
  enabled = allowAnalytics;

  const onStorage = (e) => { // tab khác đổi lựa chọn -> đồng bộ ngay
    if (e.key === null || [KEY_CONSENT, KEY_SID, KEY_PENDING].includes(e.key)) {
      evaluate(); flushPendingRevoke();
    }
  };
  const onVisible = () => { evaluate(); if (document.visibilityState === 'visible') { tick(); flushPendingRevoke(); } };
  const onOnline = () => { evaluate(); tick(); flushPendingRevoke(); };
  const onOffline = () => evaluate();

  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  retryTimer = setInterval(flushPendingRevoke, HEARTBEAT_MS);
  evaluate();
  flushPendingRevoke();

  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    clearInterval(retryTimer);
    stopLoop();
    started = false;
  };
}
