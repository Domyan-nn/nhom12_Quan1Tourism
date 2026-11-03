// Lõi thống kê ẩn danh phía khách (UC12, WBS-08). Không phụ thuộc React.
// BR13: chỉ tạo mã và gửi tín hiệu sau khi khách đồng ý.
// BR15: heartbeat mỗi 30 giây khi trang đang hiển thị và có mạng.
// BR18: rút đồng ý -> dừng gửi ngay ở mọi tab cùng nguồn, giữ mã chờ để gửi lại yêu cầu rút.

const KEY_CONSENT = 'ss.analytics.consent'; // 'granted' | 'denied' (không có = chưa chọn)
const KEY_SID = 'ss.analytics.sid';
const KEY_PENDING = 'ss.analytics.pendingRevoke';
const HEARTBEAT_MS = 30_000;
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

const listeners = new Set();
let timer = null;
let started = false;

function read(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}

export function getConsent() {
  const v = read(KEY_CONSENT);
  return v === 'granted' || v === 'denied' ? v : 'unset';
}
export function getSessionId() { return read(KEY_SID); }
export function hasPendingRevoke() { return read(KEY_PENDING) !== null; }

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
  return fetch(`${API_BASE}/api/analytics/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
    keepalive: true,
  });
}

const canSend = () =>
  getConsent() === 'granted' && !!getSessionId() &&
  document.visibilityState === 'visible' && navigator.onLine;

async function tick() {
  if (!canSend()) return;
  try {
    const res = await post('heartbeat', getSessionId());
    if (res.status === 409) { // server báo phiên đã rút -> dừng hẳn, không tạo mã mới
      write(KEY_SID, null);
      write(KEY_CONSENT, 'denied');
      evaluate();
    }
  } catch { /* mất mạng: bỏ qua, lần sau gửi lại */ }
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
  if (getConsent() === 'granted' && getSessionId()) startLoop();
  else stopLoop();
  notify();
}

export async function flushPendingRevoke() {
  const pending = read(KEY_PENDING);
  if (!pending || !navigator.onLine) return;
  try {
    const res = await post('revoke', pending);
    if (res.ok) write(KEY_PENDING, null); // chỉ xóa mã chờ khi server đã xử lý
  } catch { /* giữ mã chờ, thử lại sau */ }
  notify();
}

export function grantConsent() {
  write(KEY_CONSENT, 'granted');
  if (!getSessionId()) write(KEY_SID, newSessionId());
  evaluate();
}

export function declineConsent() {
  write(KEY_CONSENT, 'denied');
  write(KEY_SID, null); // từ chối: không tạo mã, không gửi gì
  evaluate();
}

export function withdrawConsent() {
  const sid = getSessionId();
  if (sid) write(KEY_PENDING, sid); // lưu mã chờ TRƯỚC khi xóa mã đang dùng
  write(KEY_SID, null);
  write(KEY_CONSENT, 'denied');
  evaluate(); // dừng gửi ngay
  return flushPendingRevoke();
}

// Gọi một lần khi ứng dụng khởi động.
export function initAnalytics() {
  if (started) return () => {};
  started = true;

  const onStorage = (e) => { // tab khác đổi lựa chọn -> đồng bộ ngay
    if (e.key === null || [KEY_CONSENT, KEY_SID, KEY_PENDING].includes(e.key)) evaluate();
  };
  const onVisible = () => { if (document.visibilityState === 'visible') { tick(); flushPendingRevoke(); } };
  const onOnline = () => { tick(); flushPendingRevoke(); };

  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  evaluate();
  flushPendingRevoke();

  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    stopLoop();
    started = false;
  };
}
