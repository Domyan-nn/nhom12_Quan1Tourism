import React from 'react';
import { placeMessage } from './strings.js';

export const blankPlace = { name: '', address: '', category_id: '', latitude: '', longitude: '', radius_m: '100', image_url: '' };

/** BR04 phía client; backend vẫn kiểm tra lại. Trả về mã lỗi hoặc null. */
export function validatePlace(form) {
  const lat = Number(form.latitude), lon = Number(form.longitude), radius = Number(form.radius_m);
  const ok = form.name.trim() && form.address.trim() && form.category_id && form.latitude !== '' && form.longitude !== ''
    && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
    && Number.isInteger(radius) && radius >= 20 && radius <= 1000
    && (!form.image_url || /^https?:\/\/[^\s/]+\S*$/i.test(form.image_url));
  return ok ? null : 'VALIDATION_ERROR';
}

/** UC07: biểu mẫu thêm/sửa địa điểm. */
export default function PlaceForm({ s, t, language, form, setForm, categories, selected, busy, error, onSave, onDelete }) {
  const field = (key, label, props = {}) => <label>{label}
    <input {...props} disabled={busy} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  </label>;
  return <form className="place-form" onSubmit={onSave}>
    <h3>{selected ? s.places : s.create}</h3>
    {field('name', s.name, { required: true, maxLength: 200 })}
    {field('address', s.address, { required: true, maxLength: 500 })}
    <label>{s.category}<select required disabled={busy} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
      <option value="">{s.choose}</option>
      {categories.map((c) => <option key={c.id} value={c.id}>{language === 'en' ? (c.name_en || c.name) : c.name}</option>)}
    </select></label>
    {field('latitude', s.latitude, { type: 'number', step: 'any', min: -90, max: 90, required: true })}
    {field('longitude', s.longitude, { type: 'number', step: 'any', min: -180, max: 180, required: true })}
    {field('radius_m', s.radius, { type: 'number', min: 20, max: 1000, step: 1, required: true })}
    {field('image_url', s.image, { type: 'url', maxLength: 2048 })}
    {form.image_url && /^https?:\/\//i.test(form.image_url) && <img className="place-preview" src={form.image_url} alt="" />}
    <p>{s.upload}</p>
    {error && <p role="alert" className="error">{placeMessage(s, t, error)}</p>}
    <button disabled={busy}>{busy ? t.saving : t.save}</button>
    {selected && <button type="button" className="secondary" disabled={busy} onClick={onDelete}>{t.delete}</button>}
  </form>;
}
