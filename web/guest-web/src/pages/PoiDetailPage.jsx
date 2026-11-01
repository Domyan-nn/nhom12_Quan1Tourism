import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAsync from '../hooks/useAsync.js';
import { getPoi } from '../api/publicApi.js';
import { Loading, ErrorState } from '../components/StateViews.jsx';

const LOCALE_NAMES = { vi: 'Tiếng Việt', en: 'English' };

// UC01 (chi tiết) + UC03 (chọn ngôn ngữ). Chỉ hiện ngôn ngữ có nội dung (BR03).
export default function PoiDetailPage() {
  const { id } = useParams();
  const { status, data: poi, error, retry } = useAsync(() => getPoi(id), [id]);
  const [locale, setLocale] = useState('');

  useEffect(() => {
    if (poi?.narrations?.length) setLocale(poi.narrations[0].locale);
  }, [poi]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') {
    return error?.status === 404
      ? <div className="state"><strong>Địa điểm không còn khả dụng</strong><p><Link to="/">Quay lại danh sách</Link></p></div>
      : <ErrorState onRetry={retry} />;
  }
  const narration = poi.narrations.find((n) => n.locale === locale);

  return (
    <article>
      <Link to="/" className="back">← Danh sách địa điểm</Link>
      <h1>{poi.name}</h1>
      <p className="muted">{poi.address}</p>

      <div className="chips" role="tablist" aria-label="Ngôn ngữ thuyết minh">
        {poi.narrations.map((n) => (
          <button key={n.locale} role="tab" aria-selected={n.locale === locale}
                  className={`chip ${n.locale === locale ? 'on' : ''}`}
                  onClick={() => setLocale(n.locale)}>
            {LOCALE_NAMES[n.locale] || n.locale}
          </button>
        ))}
      </div>

      {narration && (
        <div className="narration">
          <h2>{narration.title}</h2>
          <p>{narration.body}</p>
          {/* TODO(WBS-11): thay bằng TTS Player (Web Speech API) */}
          <button className="btn" disabled>Nghe thuyết minh</button>
        </div>
      )}
    </article>
  );
}
