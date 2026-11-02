import { ApiError } from './client.js';
import { categories, pois } from './mockData.js';

const normalize = (s) => s.trim().normalize('NFC').toLowerCase();

const asItems = (data) => {
  if (!Array.isArray(data?.items)) throw new ApiError('Phản hồi không hợp lệ.', 200, 'INVALID_RESPONSE');
  return data.items;
};

// Return arrays to the UI in both modes; mock lists match the public API shape.
export function createPublicApi({ apiGet, useMock }) {
  return {
    async listCategories() {
      return useMock ? categories.map((c) => ({ ...c })) : asItems(await apiGet('/categories'));
    },
    async listPois({ q = '', categoryId = '' } = {}) {
      if (!useMock) return asItems(await apiGet('/pois', { q, category_id: categoryId }));
      const key = normalize(q);
      return pois.filter((p) => (!categoryId || p.category_id === categoryId) &&
        (!key || normalize(p.name).includes(key))).map(({ narrations, ...poi }) => ({
          ...poi, narration_locales: narrations.map((n) => n.locale),
        }));
    },
    async getPoi(id) {
      if (!useMock) {
        const poi = await apiGet(`/pois/${encodeURIComponent(id)}`);
        if (!poi || !Array.isArray(poi.narrations)) throw new ApiError('Phản hồi không hợp lệ.', 200, 'INVALID_RESPONSE');
        return poi;
      }
      const poi = pois.find((p) => p.id === id);
      if (!poi) throw new ApiError('Không tìm thấy địa điểm.', 404, 'POI_NOT_FOUND');
      return { ...poi, narration_locales: poi.narrations.map((n) => n.locale),
        narrations: poi.narrations.map((n) => ({ ...n })) };
    },
  };
}
