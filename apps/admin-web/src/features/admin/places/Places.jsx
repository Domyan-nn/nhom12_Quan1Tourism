import React, { useEffect, useState } from 'react';
import { request, upload } from '../../../services/api.js';
import NarrationEditor from './NarrationEditor.jsx';
import PlaceForm, { IMAGE_TYPES, MAX_IMAGE_BYTES, blankPlace, validatePlace } from './PlaceForm.jsx';
import PlaceList from './PlaceList.jsx';
import PublicationPanel from './PublicationPanel.jsx';
import { placeMessage, placeStrings, publicationStrings, statusLabels } from './strings.js';

/** UC07–UC09: danh sách, biểu mẫu địa điểm, công bố/ẩn và bài thuyết minh của địa điểm đang chọn. */
export default function Places({ t, language, token, onExpired }) {
  const s = placeStrings[language];
  const p = publicationStrings[language];
  const labels = statusLabels[language];
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locales, setLocales] = useState([]);
  const [localesError, setLocalesError] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankPlace);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [publicationError, setPublicationError] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const fail = (err, setter) => { if (err.status === 401) onExpired(); else setter(err.code || 'SERVER_ERROR'); };

  useEffect(() => {
    let active = true;
    setLoading(true); setListError('');
    Promise.all([request('/admin/pois', { token }), request('/admin/categories', { token })])
      .then(([places, cats]) => { if (active) { setItems(places.items); setCategories(cats.items); } })
      .catch((err) => { if (active) fail(err, setListError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, version]);

  useEffect(() => {
    let active = true;
    request('/locales')
      .then((d) => { if (active) setLocales(d.items); })
      .catch((err) => { if (active) setLocalesError(err.code || 'SERVER_ERROR'); });
    return () => { active = false; };
  }, []);

  function clearMessages() { setNotice(''); setFormError(''); setPublicationError(null); }
  const toForm = (item) => ({ ...blankPlace, ...item, image_url: item.image_url || '', image_credit: item.image_credit || '' });
  function choose(item) { setSelected(item.id); setForm(toForm(item)); clearMessages(); }
  function fresh() { setSelected(null); setForm(blankPlace); clearMessages(); }

  async function changeStatus(action) {
    if (!window.confirm(action === 'publish' ? p.confirmPublish : p.confirmHide)) return;
    setBusy(true); setPublicationError(null); setNotice('');
    try {
      const data = await request(`/admin/pois/${encodeURIComponent(selected)}/${action}`, { method: 'POST', token });
      setForm((current) => ({ ...current, status: data.status }));
      setVersion((v) => v + 1);
      setNotice(action === 'publish' ? p.published : p.hidden);
    } catch (err) { if (err.status === 401) onExpired(); else setPublicationError(err); }
    finally { setBusy(false); }
  }

  async function save(e) {
    e.preventDefault(); setNotice(''); setFormError('');
    const invalid = validatePlace(form);
    if (invalid) { setFormError(invalid); return; }
    setBusy(true);
    try {
      const body = { name: form.name, address: form.address, category_id: form.category_id, latitude: Number(form.latitude),
        longitude: Number(form.longitude), radius_m: Number(form.radius_m), image_url: form.image_url || null, image_credit: form.image_credit.trim() || null };
      const data = await request(selected ? `/admin/pois/${encodeURIComponent(selected)}` : '/admin/pois', { method: selected ? 'PUT' : 'POST', token, body });
      setSelected(data.id); setForm(toForm(data)); setVersion((v) => v + 1); setNotice(s.saved);
    } catch (err) { fail(err, setFormError); }
    finally { setBusy(false); }
  }

  // F07: ảnh được lưu ngay khi tải lên; các ô khác của biểu mẫu vẫn giữ giá trị đang sửa.
  async function uploadImage(file) {
    setNotice(''); setFormError('');
    if (!IMAGE_TYPES.includes(file.type)) { setFormError('UNSUPPORTED_IMAGE_TYPE'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setFormError('IMAGE_TOO_LARGE'); return; }
    setBusy(true);
    try {
      const data = await upload(`/admin/pois/${encodeURIComponent(selected)}/image`, { token, file });
      setForm((current) => ({ ...current, image_url: data.image_url, status: data.status }));
      setVersion((v) => v + 1); setNotice(s.imageUploaded);
    } catch (err) { fail(err, setFormError); }
    finally { setBusy(false); }
  }

  async function removeImage() {
    if (!window.confirm(s.confirmRemoveImage)) return;
    setNotice(''); setFormError(''); setBusy(true);
    try {
      await request(`/admin/pois/${encodeURIComponent(selected)}/image`, { method: 'DELETE', token });
      setForm((current) => ({ ...current, image_url: '', image_credit: '' }));
      setVersion((v) => v + 1); setNotice(s.imageRemoved);
    } catch (err) { fail(err, setFormError); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(s.confirm)) return;
    setBusy(true); setFormError('');
    try {
      await request(`/admin/pois/${encodeURIComponent(selected)}`, { method: 'DELETE', token });
      fresh(); setNotice(s.deleted); setVersion((v) => v + 1);
    } catch (err) { fail(err, setFormError); }
    finally { setBusy(false); }
  }

  return <div className="panel places">
    <h2>{s.places}</h2>
    <button type="button" className="secondary" disabled={busy} onClick={fresh}>{s.create}</button>
    {loading ? <p role="status">{t.loading}</p>
      : listError ? <p role="alert" className="error">{placeMessage(s, t, listError)} <button className="text-button" onClick={() => setVersion((v) => v + 1)}>{s.retry}</button></p>
      : <PlaceList s={s} t={t} labels={labels} items={items} busy={busy} onChoose={choose} />}
    {notice && <p role="status">{notice}</p>}
    {selected && <PublicationPanel s={s} p={p} t={t} labels={labels} status={form.status} busy={busy} error={publicationError} onChange={changeStatus} />}
    <PlaceForm s={s} t={t} language={language} form={form} setForm={setForm} categories={categories} selected={selected}
      busy={busy} error={formError} onSave={save} onDelete={remove} onUpload={uploadImage} onRemoveImage={removeImage} />
    {selected && <NarrationEditor key={selected} s={s} t={t} language={language} token={token} poiId={selected} locales={locales}
      localesError={localesError} busy={busy} setBusy={setBusy} onExpired={onExpired} onNotice={setNotice} />}
  </div>;
}
