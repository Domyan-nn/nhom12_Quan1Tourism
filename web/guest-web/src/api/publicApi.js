import { apiGet, USE_MOCK } from './client.js';
import { categories, pois } from './mockData.js';

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const normalize = (s) => s.trim().normalize('NFC').toLowerCase();

// GET /api/public/categories
export async function listCategories() {
  if (!USE_MOCK) return apiGet('/public/categories');
  await wait(150);
  return categories;
}

// GET /api/public/pois?q=&category_id=   (BR01, BR02)
export async function listPois({ q = '', categoryId = '' } = {}) {
  if (!USE_MOCK) return apiGet('/public/pois', { q, category_id: categoryId });
  await wait();
  const key = normalize(q);
  return pois.filter(
    (p) =>
      (!categoryId || p.category_id === categoryId) &&
      (!key || normalize(p.name).includes(key))
  );
}

// GET /api/public/pois/{id}
export async function getPoi(id) {
  if (!USE_MOCK) return apiGet(`/public/pois/${id}`);
  await wait();
  const poi = pois.find((p) => p.id === id);
  if (!poi) throw Object.assign(new Error('Không tìm thấy địa điểm.'), { status: 404 });
  return poi;
}
