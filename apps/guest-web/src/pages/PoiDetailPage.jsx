import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAsync from '../hooks/useAsync.js';
import { getPoi } from '../api/index.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Loading, ErrorState } from '../components/StateViews.jsx';
import TtsControls from '../components/TtsControls.jsx';

// Cùng danh sách với backend app/core/locales.py; mã lạ vẫn hiện nguyên mã.
const LOCALE_NAMES = { vi: 'Tiếng Việt', en: 'English', fr: 'Français', zh: '中文', ja: '日本語', ko: '한국어' };

// UC01 (chi tiết) + UC03 (chọn ngôn ngữ). Chỉ hiện ngôn ngữ có nội dung (BR03).
export default function PoiDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const { status, data: poi, error, retry } = useAsync(() => getPoi(id), [id]);
  const [locale, setLocale] = useState('');

  useEffect(() => {
    // UI language changes do not affect the selected narration language.
    setLocale(poi?.narrations?.[0]?.locale || '');
  }, [poi]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') {
    return error?.status === 404
      ? <div className="state"><strong>{t.unavailable}</strong><p><Link to="/">{t.returnList}</Link></p></div>
      : <ErrorState error={error} onRetry={retry} />;
  }
  const narration = poi.narrations.find((n) => n.locale === locale);

  return (
    <article>
      <Link to="/" className="back">{t.back}</Link>
      <h1>{poi.name}</h1>
      <p className="muted">{poi.address}</p>

      <div className="chips" role="group" aria-label={t.narrationLanguage}>
        {poi.narrations.map((n) => (
          <button key={n.locale} aria-pressed={n.locale === locale}
                  className={`chip ${n.locale === locale ? 'on' : ''}`}
                  onClick={() => setLocale(n.locale)}>
            {LOCALE_NAMES[n.locale] || n.locale}
          </button>
        ))}
      </div>

      {!poi.narrations.length && <p role="status">{t.noNarration}</p>}
      {narration && (
        <div className="narration">
          <h2>{narration.title}</h2>
          <p>{narration.body}</p>
          <TtsControls t={t} poiId={poi.id} locale={narration.locale}
                       localeName={LOCALE_NAMES[narration.locale] || narration.locale}
                       title={narration.title} body={narration.body} />
        </div>
      )}
    </article>
  );
}
