// UC05-A1: giữ phiên Admin khi tải lại trang trong cùng tab.
// sessionStorage tự xóa khi đóng tab; token đọc lại luôn được backend xác nhận qua /admin/me
// trước khi dùng (BR09), nên bản lưu cục bộ không tự cấp quyền.
const KEY = 'ss.admin.session';

export function loadSession(now = Date.now()) {
  let raw;
  try { raw = window.sessionStorage.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const expires = Date.parse(session?.expires_at);
    if (typeof session?.access_token === 'string' && session.access_token && expires > now) return session;
  } catch { /* Bản lưu hỏng: bỏ qua. */ }
  clearSession();
  return null;
}

export function saveSession({ access_token, expires_at, username }) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ access_token, expires_at, username })); }
  catch { /* Trình duyệt chặn lưu trữ: vẫn dùng được, chỉ mất phiên khi tải lại. */ }
}

export function clearSession() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* Không có gì để xóa. */ }
}
