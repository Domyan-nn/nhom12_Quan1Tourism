import React, { useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

export default function Categories({ t, token, onExpired }) {
  const [items, setItems] = useState([]), [name, setName] = useState(''), [nameEn, setNameEn] = useState(''), [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    request('/admin/categories', { token }).then(data => { if (active) setItems(data.items); }).catch(err => { if (active) { if (err.status === 401) onExpired(); else setError(err.code || 'SERVER_ERROR'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, version]);
  async function change(action) {
    setBusy(true); setError('');
    try { await action(); setName(''); setNameEn(''); setEditing(null); setVersion(v => v + 1); }
    catch (err) { if (err.status === 401) onExpired(); else setError(err.code || 'SERVER_ERROR'); }
    finally { setBusy(false); }
  }
  function submit(e) {
    e.preventDefault();
    change(() => request(editing ? `/admin/categories/${encodeURIComponent(editing)}` : '/admin/categories', { method: editing ? 'PATCH' : 'POST', token, body: { name, name_en: nameEn } }));
  }
  function remove(item) {
    if (window.confirm(t.confirm)) change(() => request(`/admin/categories/${encodeURIComponent(item.id)}`, { method: 'DELETE', token }));
  }
  return <div className="panel"><form className="category-form" onSubmit={submit}><label>{t.categoryName}<input value={name} maxLength="200" required onChange={e => setName(e.target.value)} /></label><label>{t.categoryNameEn}<input value={nameEn} maxLength="200" required onChange={e => setNameEn(e.target.value)} /></label><button disabled={busy}>{busy ? t.saving : editing ? t.save : t.add}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setName(''); setNameEn(''); }}>{t.cancel}</button>}</form>{error && <div role="alert" className="error">{t[error] || t.SERVER_ERROR} {loading === false && <button className="text-button" onClick={() => setVersion(v => v + 1)}>{t.retry}</button>}</div>}{loading ? <p role="status">{t.loading}</p> : !items.length && !error ? <p>{t.noCategories}</p> : <ul className="category-list">{items.map(item => <li key={item.id}><span>{item.name} / {item.name_en || t.missingTranslation}</span><div><button className="text-button" disabled={busy} onClick={() => { setEditing(item.id); setName(item.name); setNameEn(item.name_en || ''); }}>{t.edit}</button><button className="text-button danger" disabled={busy} onClick={() => remove(item)}>{t.delete}</button></div></li>)}</ul>}</div>;
}
