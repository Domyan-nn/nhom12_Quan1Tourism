import { useState } from 'react';
import useAsync from '../hooks/useAsync.js';
import { listCategories, listPois } from '../api/index.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import PoiCard from '../components/PoiCard.jsx';
import { Loading, Empty, ErrorState } from '../components/StateViews.jsx';

// UC01: tìm theo tên, lọc theo danh mục, kết hợp cả hai (BR02).
export default function ExplorePage() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const cats = useAsync(() => listCategories(), []);
  const pois = useAsync(() => listPois({ q, categoryId }), [q, categoryId]);
  const localizedName = (category) => language === 'en' ? category?.name_en || category?.name : category?.name;
  const catName = (id) => localizedName(cats.data?.find((c) => c.id === id));

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
      </div>

      {pois.status === 'loading' && <Loading />}
      {pois.status === 'error' && <ErrorState error={pois.error} onRetry={pois.retry} />}
      {pois.status === 'success' && pois.data.length === 0 && (
        <Empty title={t.empty} hint={t.emptyHint} />
      )}
      {pois.status === 'success' && pois.data.length > 0 && (
        <div className="grid">
          {pois.data.map((p) => <PoiCard key={p.id} poi={p} categoryName={catName(p.category_id)} />)}
        </div>
      )}
    </section>
  );
}
