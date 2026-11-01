import { useState } from 'react';
import useAsync from '../hooks/useAsync.js';
import { listCategories, listPois } from '../api/publicApi.js';
import PoiCard from '../components/PoiCard.jsx';
import { Loading, Empty, ErrorState } from '../components/StateViews.jsx';

// UC01: tìm theo tên, lọc theo danh mục, kết hợp cả hai (BR02).
export default function ExplorePage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const cats = useAsync(() => listCategories(), []);
  const pois = useAsync(() => listPois({ q, categoryId }), [q, categoryId]);
  const catName = (id) => cats.data?.find((c) => c.id === id)?.name;

  return (
    <section>
      <h1>Khám phá Quận 1</h1>
      <p className="muted lead">Tìm địa điểm, xem vị trí và nghe thuyết minh bằng ngôn ngữ của bạn.</p>

      <div className="filters">
        <label className="sr-only" htmlFor="q">Tìm theo tên địa điểm</label>
        <input id="q" type="search" placeholder="Tìm theo tên địa điểm" value={q}
               onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Lọc theo danh mục">
          <button className={`chip ${categoryId === '' ? 'on' : ''}`} onClick={() => setCategoryId('')}>Tất cả</button>
          {cats.data?.map((c) => (
            <button key={c.id} className={`chip ${categoryId === c.id ? 'on' : ''}`}
                    onClick={() => setCategoryId(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>

      {pois.status === 'loading' && <Loading />}
      {pois.status === 'error' && <ErrorState onRetry={pois.retry} />}
      {pois.status === 'success' && pois.data.length === 0 && (
        <Empty title="Không có địa điểm phù hợp" hint="Đổi từ khóa hoặc chọn danh mục khác." />
      )}
      {pois.status === 'success' && pois.data.length > 0 && (
        <div className="grid">
          {pois.data.map((p) => <PoiCard key={p.id} poi={p} categoryName={catName(p.category_id)} />)}
        </div>
      )}
    </section>
  );
}
