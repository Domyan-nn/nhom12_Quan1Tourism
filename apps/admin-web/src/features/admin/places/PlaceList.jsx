import React, { useState } from 'react';

// Giống backend app/core/text.py: không phân biệt hoa/thường, dấu tiếng Việt và đ.
const searchKey = (value) => String(value ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Danh sách địa điểm cho Admin, có tìm theo tên và lọc trạng thái (trả về fragment: ul nằm trực tiếp trong .places). */
export default function PlaceList({ s, t, labels, items, busy, onChoose }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  if (!items.length) return <p>{s.empty}</p>;
  const key = searchKey(query);
  const shown = items.filter((item) => (!status || item.status === status) && (!key || searchKey(item.name).includes(key)));
  return <>
    <div className="place-filters">
      <label>{s.search}<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>{s.filter}<select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">{s.allStatuses}</option>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    {!shown.length ? <p>{s.noMatch}</p> : <ul className="category-list">
      {shown.map((item) => <li key={item.id}>
        <span>{item.name} · <span className={`status status-${item.status}`}>{labels[item.status] || item.status}</span></span>
        <button className="text-button" disabled={busy} onClick={() => onChoose(item)}>{t.edit}</button>
      </li>)}
    </ul>}
  </>;
}
