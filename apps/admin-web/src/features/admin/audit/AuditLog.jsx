import React, { useCallback, useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

// Nhật ký thao tác Admin (phần mở rộng C): chỉ đọc; backend ghi mỗi thao tác thành công.
const LIMITS = [50, 100, 200];
const strings = {
  vi: {
    title: 'Nhật ký thao tác', hint: 'Các thao tác quản trị đã thực hiện thành công, mới nhất trước. Giờ theo giờ Việt Nam (UTC+7). Không lưu mật khẩu hay nội dung bài thuyết minh.',
    time: 'Thời gian', admin: 'Quản trị viên', action: 'Thao tác', target: 'Đối tượng', limit: 'Số dòng', refresh: 'Làm mới', retry: 'Thử lại',
    loading: 'Đang tải…', empty: 'Chưa có thao tác nào được ghi lại.', shown: 'Hiển thị {n} dòng mới nhất.',
    NETWORK_ERROR: 'Không kết nối được API.', SERVER_ERROR: 'Không thể tải nhật ký.', DATABASE_ERROR: 'Không thể tải nhật ký.',
    actions: {
      'auth.login': 'Đăng nhập', 'auth.logout': 'Đăng xuất',
      'category.create': 'Thêm danh mục', 'category.update': 'Sửa danh mục', 'category.delete': 'Xóa danh mục',
      'poi.create': 'Thêm địa điểm', 'poi.update': 'Sửa địa điểm', 'poi.delete': 'Xóa địa điểm', 'poi.publish': 'Công bố địa điểm', 'poi.hide': 'Ẩn địa điểm',
      'poi.image_upload': 'Tải ảnh địa điểm', 'poi.image_delete': 'Xóa ảnh địa điểm',
      'narration.create': 'Thêm bài thuyết minh', 'narration.update': 'Sửa bài thuyết minh', 'narration.delete': 'Xóa bài thuyết minh',
    },
  },
  en: {
    title: 'Activity log', hint: 'Admin actions that succeeded, newest first. Times are in Vietnam time (UTC+7). Passwords and narration text are never stored.',
    time: 'Time', admin: 'Admin', action: 'Action', target: 'Target', limit: 'Rows', refresh: 'Refresh', retry: 'Retry',
    loading: 'Loading…', empty: 'No actions have been recorded yet.', shown: 'Showing the latest {n} rows.',
    NETWORK_ERROR: 'Cannot reach the API.', SERVER_ERROR: 'Unable to load the activity log.', DATABASE_ERROR: 'Unable to load the activity log.',
    actions: {
      'auth.login': 'Signed in', 'auth.logout': 'Signed out',
      'category.create': 'Added category', 'category.update': 'Edited category', 'category.delete': 'Deleted category',
      'poi.create': 'Added place', 'poi.update': 'Edited place', 'poi.delete': 'Deleted place', 'poi.publish': 'Published place', 'poi.hide': 'Hid place',
      'poi.image_upload': 'Uploaded place image', 'poi.image_delete': 'Removed place image',
      'narration.create': 'Added narration', 'narration.update': 'Edited narration', 'narration.delete': 'Deleted narration',
    },
  },
};

export default function AuditLog({ language, token, onExpired }) {
  const s = strings[language] || strings.vi;
  const [items, setItems] = useState(null), [error, setError] = useState(''), [limit, setLimit] = useState(LIMITS[0]), [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setItems(null); setError('');
    request(`/admin/audit-log?limit=${limit}`, { token, signal: controller.signal })
      .then((data) => { if (live) setItems(data.items); })
      .catch((err) => {
        if (!live || controller.signal.aborted) return;
        if (err.status === 401) onExpired(); else setError(err.code || 'SERVER_ERROR');
      });
    return () => { live = false; controller.abort(); };
  }, [token, limit, tick, onExpired]);

  const when = useCallback((iso) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)), [language]);

  return <div className="panel audit-log">
    <h2>{s.title}</h2>
    <p className="muted">{s.hint}</p>
    <div className="audit-toolbar">
      <label>{s.limit}<select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      <button type="button" className="secondary" onClick={() => setTick((n) => n + 1)}>{s.refresh}</button>
    </div>
    {error && <div role="alert" className="error">{s[error] || s.SERVER_ERROR} <button type="button" className="text-button" onClick={() => setTick((n) => n + 1)}>{s.retry}</button></div>}
    {!error && items === null && <p role="status">{s.loading}</p>}
    {!error && items && !items.length && <p>{s.empty}</p>}
    {!error && items && items.length > 0 && <>
      <div className="audit-wrap">
        <table className="stat-table audit-table">
          <thead><tr><th scope="col">{s.time}</th><th scope="col">{s.admin}</th><th scope="col">{s.action}</th><th scope="col">{s.target}</th></tr></thead>
          <tbody>{items.map((row) => <tr key={row.id}>
            <td><time dateTime={row.created_at}>{when(row.created_at)}</time></td>
            <td>{row.admin_username}</td>
            <td>{s.actions[row.action] || row.action}</td>
            <td>{row.summary || ''}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="muted">{s.shown.replace('{n}', items.length)}</p>
    </>}
  </div>;
}
