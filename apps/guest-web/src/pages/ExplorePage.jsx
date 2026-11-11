import { useMemo, useState } from 'react';
import useAsync from '../hooks/useAsync.js';
import { listCategories, listPois } from '../api/index.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import PoiCard from '../components/PoiCard.jsx';
import { formatDistance, sortByDistance } from '../features/nearMe/nearMe.js';
import useNearMe from '../features/nearMe/useNearMe.js';
import { Loading, Empty, ErrorState } from '../components/StateViews.jsx';

// UC01: tìm theo tên, lọc theo danh mục, kết hợp cả hai (BR02).
// Phần B "Gần tôi": sắp xếp theo khoảng cách ngay trên máy khách, không gửi tọa độ lên server (BR07).
const NEAR_ME_ERRORS = {
  DENIED: 'nearMeDenied', UNAVAILABLE: 'nearMeUnavailable', TIMEOUT: 'nearMeTimeout',
  UNSUPPORTED: 'nearMeUnsupported', INSECURE: 'nearMeInsecure',
};

export default function ExplorePage() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const cats = useAsync(() => listCategories(), []);
  const pois = useAsync(() => listPois({ q, categoryId }), [q, categoryId]);
  const localizedName = (category) => language === 'en' ? category?.name_en || category?.name : category?.name;
  const catName = (id) => localizedName(cats.data?.find((c) => c.id === id));
  const nearMe = useNearMe();
  const rows = useMemo(
    () => (pois.status === 'success'
      ? sortByDistance(pois.data, nearMe.status === 'on' ? nearMe.origin : null)
      : []),
    [pois.status, pois.data, nearMe.status, nearMe.origin],
  );

  return (
    <section>
      <h1>{t.exploreTitle}</h1>
      <p className="muted lead">{t.exploreHint}</p>

      <div className="filters">
        <label className="sr-only" htmlFor="q">{t.search}</label>
        <input id="q" type="search" placeholder={t.search} value={q}
               onChange={(e) => setQ(e.target.value)} />
        {cats.status === 'error' && <ErrorState message={t.categoriesError} onRetry={cats.retry} />}
        <div className="chips" role="group" aria-label={t.filter}>
          <button className={`chip ${categoryId === '' ? 'on' : ''}`} onClick={() => setCategoryId('')}>{t.all}</button>
          {cats.data?.map((c) => (
            <button key={c.id} className={`chip ${categoryId === c.id ? 'on' : ''}`}
                    onClick={() => setCategoryId(c.id)}>{localizedName(c)}</button>
          ))}
        </div>
        <div className="near-me">
          <button type="button" className={`chip ${nearMe.status === 'on' ? 'on' : ''}`}
                  aria-pressed={nearMe.status === 'on'} disabled={nearMe.status === 'locating'}
                  onClick={nearMe.status === 'on' ? nearMe.deactivate : nearMe.activate}>
            {nearMe.status === 'locating' ? t.nearMeLocating : t.nearMe}
          </button>
          {nearMe.status === 'on' && <span className="muted">{t.nearMeActive}</span>}
          {nearMe.status === 'error' && (
            <p className="near-me-alert" role="alert">{t[NEAR_ME_ERRORS[nearMe.errorCode] || 'nearMeUnavailable']}</p>
          )}
        </div>
      </div>

      {pois.status === 'loading' && <Loading />}
      {pois.status === 'error' && <ErrorState error={pois.error} onRetry={pois.retry} />}
      {pois.status === 'success' && pois.data.length === 0 && (
        <Empty title={t.empty} hint={t.emptyHint} />
      )}
      {pois.status === 'success' && pois.data.length > 0 && (
        <div className="grid">
          {rows.map(({ poi, distance_m }) => (
            <PoiCard key={poi.id} poi={poi} categoryName={catName(poi.category_id)}
                     distanceLabel={nearMe.status === 'on' ? formatDistance(distance_m, language) : ''} />
          ))}
        </div>
      )}
    </section>
  );
}
