import React, { useEffect, useState } from 'react';
import { request } from '../../../services/api.js';
import { placeMessage } from './strings.js';

const blankText = { locale: '', title: '', body: '' };

/**
 * UC08: bài thuyết minh của một địa điểm, tối đa một bài cho mỗi ngôn ngữ (BR03).
 * Chỉ chọn được ngôn ngữ trong danh sách hỗ trợ của backend; ngôn ngữ đã có bài bị khóa.
 */
export default function NarrationEditor({ s, t, language, token, poiId, locales, localesError, busy, setBusy, onExpired, onNotice }) {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState(blankText);
  const [version, setVersion] = useState(0);

  const fail = (err, setter) => { if (err.status === 401) onExpired(); else setter(err.code || 'SERVER_ERROR'); };

  useEffect(() => {
    let active = true;
    setLoading(true); setListError('');
    request(`/admin/pois/${encodeURIComponent(poiId)}/narrations`, { token })
      .then((d) => { if (active) setTexts(d.items); })
      .catch((err) => { if (active) fail(err, setListError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiId, token, version]);

  const localeName = (code) => {
    const item = locales.find((l) => l.code === code);
    return item ? (language === 'en' ? item.name_en : item.name) : code;
  };
  const used = new Set(texts.map((n) => n.locale));
  // Bài cũ có mã ngoài danh sách vẫn sửa được: thêm mã đó vào lựa chọn khi đang sửa.
  const options = editing && text.locale && !locales.some((l) => l.code === text.locale)
    ? [...locales, { code: text.locale, name: text.locale, name_en: text.locale }] : locales;

  function reset() { setEditing(null); setText(blankText); }

  async function save(e) {
    e.preventDefault(); setActionError(''); onNotice('');
    if (!text.title.trim() || !text.body.trim() || (!editing && !text.locale)) { setActionError('VALIDATION_ERROR'); return; }
    setBusy(true);
    try {
      const path = `/admin/pois/${encodeURIComponent(poiId)}/narrations${editing ? '/' + encodeURIComponent(editing) : ''}`;
      await request(path, { method: editing ? 'PUT' : 'POST', token, body: editing ? { title: text.title, body: text.body } : text });
      reset(); setVersion((v) => v + 1); onNotice(s.saved);
    } catch (err) { fail(err, setActionError); }
    finally { setBusy(false); }
  }

  async function remove(n) {
    if (!window.confirm(s.confirmText.replace('{lang}', localeName(n.locale)))) return;
    setActionError(''); onNotice(''); setBusy(true);
    try {
      await request(`/admin/pois/${encodeURIComponent(poiId)}/narrations/${encodeURIComponent(n.id)}`, { method: 'DELETE', token });
      if (editing === n.id) reset();
      setVersion((v) => v + 1); onNotice(s.textDeleted);
    } catch (err) { fail(err, setActionError); }
    finally { setBusy(false); }
  }

  return <section>
    <h3>{s.narrations}</h3>
    {loading ? <p role="status">{t.loading}</p>
      : listError ? <p role="alert" className="error">{placeMessage(s, t, listError)} <button className="text-button" onClick={() => setVersion((v) => v + 1)}>{s.retry}</button></p>
      : !texts.length ? <p>{s.noText}</p>
      : <ul className="category-list">{texts.map((n) => <li key={n.id}>
          <span>{n.locale} · {n.title}</span>
          <div>
            <button className="text-button" disabled={busy} onClick={() => { setEditing(n.id); setText({ locale: n.locale, title: n.title, body: n.body }); setActionError(''); }}>{t.edit}</button>
            <button className="text-button danger" disabled={busy} onClick={() => remove(n)}>{t.delete}</button>
          </div>
        </li>)}</ul>}
    <form className="place-form" onSubmit={save}>
      <h4>{editing ? `${t.edit}: ${localeName(text.locale)}` : s.newText}</h4>
      <label>{s.locale}<select required disabled={busy || !!editing} value={text.locale} onChange={(e) => setText({ ...text, locale: e.target.value })}>
        <option value="">{s.chooseLocale}</option>
        {options.map((l) => {
          const taken = used.has(l.code) && !(editing && text.locale === l.code);
          return <option key={l.code} value={l.code} disabled={taken}>{`${l.code} · ${language === 'en' ? l.name_en : l.name}${taken ? ` (${s.hasNarration})` : ''}`}</option>;
        })}
      </select></label>
      {localesError && <p className="muted">{s.localesError}</p>}
      <label>{s.title}<input required disabled={busy} maxLength="500" value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} /></label>
      <label>{s.body}<textarea required disabled={busy} rows="8" value={text.body} onChange={(e) => setText({ ...text, body: e.target.value })} /></label>
      {actionError && <p role="alert" className="error">{placeMessage(s, t, actionError)}</p>}
      <button disabled={busy}>{t.save}</button>
      {editing && <button type="button" className="secondary" disabled={busy} onClick={reset}>{t.cancel}</button>}
    </form>
  </section>;
}
