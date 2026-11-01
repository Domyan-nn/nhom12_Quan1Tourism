import React, { useEffect, useState } from 'react';
import { request } from '../../services/api.js';

export default function Places({ t }) {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [places, setPlaces] = useState([]);
  const [detail, setDetail] = useState(null);
  const [locale, setLocale] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category_id', category);
    Promise.all([request('/categories'), request(`/pois?${params}`)])
      .then(([cats, result]) => { if (active) { setCategories(cats.items); setPlaces(result.items); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category, attempt]);

  async function openPlace(id) {
    setLoading(true); setError(false);
    try {
      const place = await request(`/pois/${encodeURIComponent(id)}`);
      setDetail(place); setLocale(place.narrations[0]?.locale || '');
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  const narration = detail?.narrations.find(item => item.locale === locale);
  return <main className="container">
    <section className="hero"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></section>
    {detail ? <section className="detail">
      <button className="text-button" onClick={() => { setDetail(null); setError(false); }}>← {t.back}</button>
      <p className="eyebrow">{categories.find(c => c.id === detail.category_id)?.name}</p>
      <h2>{detail.name}</h2><p className="address">{t.address}: {detail.address}</p>
      {detail.narrations.length ? <><label htmlFor="narration">{t.narration}</label><select id="narration" value={locale} onChange={e => setLocale(e.target.value)}>{detail.narrations.map(n => <option key={n.locale} value={n.locale}>{n.locale}</option>)}</select><article><h3>{narration?.title}</h3><p className="narration">{narration?.body}</p></article></> : <p>{t.noNarration}</p>}
    </section> : <section>
      <div className="filters"><label>{t.search}<input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.searchPlaceholder} /></label><label>{t.category}<select value={category} onChange={e => setCategory(e.target.value)}><option value="">{t.all}</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
      {loading ? <p role="status">{t.loading}</p> : error ? <div role="alert"><p>{t.error}</p><button onClick={() => setAttempt(n => n + 1)}>{t.retry}</button></div> : places.length === 0 ? <p className="empty">{t.empty}</p> : <div className="grid">{places.map(place => <article className="card" key={place.id}><p className="eyebrow">{categories.find(c => c.id === place.category_id)?.name}</p><h2>{place.name}</h2><p>{place.address}</p><button className="text-button" onClick={() => openPlace(place.id)}>{t.detail} →</button></article>)}</div>}
    </section>}
    {detail && error && <p role="alert">{t.error}</p>}
  </main>;
}
