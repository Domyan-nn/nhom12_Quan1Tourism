import React from 'react';
import { placeMessage } from './strings.js';

/** UC09: trạng thái hiện tại và nút Công bố/Ẩn; lỗi nêu đúng mục còn thiếu (E1). */
export default function PublicationPanel({ s, p, t, labels, status, busy, error, onChange }) {
  const published = status === 'published';
  let message = null;
  if (error) {
    message = error.code === 'POI_NOT_PUBLISHABLE'
      ? `${p.missingFields} ${error.details.map((key) => p[key] || key).join(', ')}`
      : error.code === 'INVALID_STATUS_TRANSITION' ? p.changed : placeMessage(s, t, error.code);
  }
  return <section aria-label={s.status}>
    <p>{s.status}: <span className={`status status-${status}`}>{labels[status] || status}</span></p>
    <button type="button" disabled={busy} onClick={() => onChange(published ? 'hide' : 'publish')}>{published ? p.hide : p.publish}</button>
    {published && <p className="muted">{s.liveEdit}</p>}
    {message && <p role="alert" className="error">{message}</p>}
  </section>;
}
