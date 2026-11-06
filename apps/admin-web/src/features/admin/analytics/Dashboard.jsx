import React, { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../../../services/api.js';

const REFRESH_MS = 30000; // BR17: tự làm mới mỗi 30 giây khi trang hiển thị
const strings = {
  vi: { title: 'Thống kê truy cập', active: 'Số khách đang hoạt động', activeHint: 'Ước lượng theo mã phiên ẩn danh có tín hiệu trong 90 giây gần nhất; không phải số người duy nhất.',
    today: 'Lượt hôm nay', last7: '7 ngày gần nhất (gồm hôm nay)', measured: 'Đo lúc', lastOk: 'Lần thành công gần nhất', unavailable: 'Không khả dụng', retry: 'Thử lại', refresh: 'Làm mới',
    range: 'Khoảng ngày (tối đa 30 ngày gần nhất)', from: 'Từ ngày', to: 'Đến ngày', apply: 'Xem', clear: 'Bỏ lọc', total: 'Tổng lượt trong khoảng', date: 'Ngày', visits: 'Lượt',
    tz: 'Ngày tính theo giờ Việt Nam (UTC+7). Chỉ gồm khách đã đồng ý thống kê.', loading: 'Đang tải…',
    INVALID_DATE_RANGE: 'Khoảng ngày không hợp lệ hoặc ngoài 30 ngày gần nhất.', NETWORK_ERROR: 'Không kết nối được API.', SERVER_ERROR: 'Không thể tải số liệu.' },
  en: { title: 'Traffic statistics', active: 'Active visitors', activeHint: 'Estimate based on anonymous session IDs seen in the last 90 seconds; not unique people.',
    today: 'Visits today', last7: 'Last 7 days (including today)', measured: 'Measured at', lastOk: 'Last successful update', unavailable: 'Unavailable', retry: 'Retry', refresh: 'Refresh',
    range: 'Date range (within the last 30 days)', from: 'From', to: 'To', apply: 'View', clear: 'Clear filter', total: 'Total visits in range', date: 'Date', visits: 'Visits',
    tz: 'Days use Vietnam time (UTC+7). Only visitors who consented are counted.', loading: 'Loading…',
    INVALID_DATE_RANGE: 'Invalid range or outside the last 30 days.', NETWORK_ERROR: 'Cannot reach the API.', SERVER_ERROR: 'Unable to load statistics.' },
};

const vnDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d); // YYYY-MM-DD
};
const fmtTime = iso => (iso ? new Date(iso).toLocaleTimeString([], {timeZone:'Asia/Ho_Chi_Minh'}) : '');

export default function Dashboard({ language, token, onExpired }) {
  const s = strings[language] || strings.vi;
  const [active, setActive] = useState(null), [activeErr, setActiveErr] = useState(''), [lastOk, setLastOk] = useState('');
  const [visits, setVisits] = useState(null), [visitsErr, setVisitsErr] = useState('');
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [rangeErr, setRangeErr] = useState('');
  const [query, setQuery] = useState(''), [tick, setTick] = useState(0);
  const activeRequest = useRef(null);

  const fail = useCallback((e, set) => { if (e.status === 401) onExpired(); else set(e.code || 'SERVER_ERROR'); }, [onExpired]);

  // UC11: số phiên đang hoạt động; lỗi => "Không khả dụng", giữ lần thành công gần nhất (BR19).
  const loadActive = useCallback(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return request('/admin/stats/active', { token, signal:controller.signal })
      .then(d => { if (!controller.signal.aborted) { setActive(d); setActiveErr(''); setLastOk(d.measured_at); } })
      .catch(e => { if (!controller.signal.aborted) fail(e, setActiveErr); });
  }, [token, fail]);
  useEffect(() => {
    loadActive();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadActive(); }, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') loadActive(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { activeRequest.current?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadActive]);

  // UC10: hôm nay, 7 ngày và khoảng ngày tùy chọn. Lỗi không được thay bằng 0.
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setVisits(null);
    setVisitsErr('');
    request(`/admin/stats/visits${query}`, { token, signal:controller.signal })
      .then(d => { if (live) setVisits(d); })
      .catch(e => { if (live) { setVisits(null); fail(e, setVisitsErr); } });
    return () => { live = false; controller.abort(); };
  }, [token, query, tick, fail]);

  function apply(e) {
    e.preventDefault(); setRangeErr('');
    const min = vnDate(-29), max = vnDate(0);
    if (!from || !to || from > to || from < min || to > max) { setRangeErr('INVALID_DATE_RANGE'); return; }
    setQuery(`?date_from=${from}&date_to=${to}`);
  }
  function clear() { setFrom(''); setTo(''); setRangeErr(''); setQuery(''); }

  const num = v => <strong className="stat-number">{v}</strong>;
  const unavailable = (code, retry) => <p role="alert" className="error">{s.unavailable} · {s[code] || s.SERVER_ERROR} <button className="text-button" onClick={retry}>{s.retry}</button></p>;

  return <div className="panel dashboard"><h2>{s.title}</h2>
    <section aria-live="polite"><h3>{s.active}</h3>
      {activeErr ? <>{unavailable(activeErr, loadActive)}{lastOk && <p className="muted">{s.lastOk}: {fmtTime(lastOk)} ({active?.active_sessions})</p>}</>
        : active ? <><p>{num(active.active_sessions)}</p><p className="muted">{s.measured}: {fmtTime(active.measured_at)} · <button className="text-button" onClick={loadActive}>{s.refresh}</button></p></>
        : <p role="status">{s.loading}</p>}
      <p className="muted">{s.activeHint}</p></section>
    <section><h3>{s.title}</h3>
      {visitsErr ? unavailable(visitsErr, () => setTick(t => t + 1))
        : !visits ? <p role="status">{s.loading}</p>
        : <><div className="stat-row"><div><p className="muted">{s.today}</p>{num(visits.today)}</div><div><p className="muted">{s.last7}</p>{num(visits.last_7_days)}</div></div>
          <p className="muted">{s.measured}: {fmtTime(visits.measured_at)} · {s.tz}</p></>}
      <form className="range-form" onSubmit={apply}><h4>{s.range}</h4>
        <label>{s.from}<input type="date" value={from} min={vnDate(-29)} max={vnDate(0)} onChange={e => setFrom(e.target.value)} /></label>
        <label>{s.to}<input type="date" value={to} min={vnDate(-29)} max={vnDate(0)} onChange={e => setTo(e.target.value)} /></label>
        <button>{s.apply}</button>{query && <button type="button" className="secondary" onClick={clear}>{s.clear}</button>}
        {rangeErr && <p role="alert" className="error">{s[rangeErr]}</p>}</form>
      {visits?.range && <div><p>{s.total} ({visits.range.from} → {visits.range.to}): {num(visits.range.total)}</p>
        <table className="stat-table"><thead><tr><th>{s.date}</th><th>{s.visits}</th></tr></thead><tbody>{visits.range.days.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.visits}</td></tr>)}</tbody></table></div>}
    </section></div>;
}
