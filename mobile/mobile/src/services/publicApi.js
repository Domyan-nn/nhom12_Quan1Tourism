// IAppAPI phía khách (UC01/UC02): danh mục, địa điểm công khai.
// Hỗ trợ 2 kiểu đường dẫn vì backend (main) và API_CONTRACT.md đang khác nhau:
//   v1       -> /v1/categories, /v1/pois, /v1/pois/{id}   phản hồi {"items": [...]}
//   contract -> /public/categories, /public/pois, ...     phản hồi là mảng
// Khi nhóm thống nhất một kiểu, chỉ cần đổi EXPO_PUBLIC_API_STYLE.

import { categories as mockCategories, pois as mockPois } from './mockData';
import { ApiError } from './apiClient';

const PATHS = {
  v1: { categories: '/v1/categories', pois: '/v1/pois' },
  contract: { categories: '/public/categories', pois: '/public/pois' },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** BR02: cắt khoảng trắng, chuẩn hóa NFC, không phân biệt hoa/thường. */
export const normalizeText = (s) => String(s ?? '').trim().normalize('NFC').toLocaleLowerCase('vi');

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  throw new ApiError('Phản hồi danh sách không hợp lệ.', { code: 'INVALID_RESPONSE' });
};

function normalizePoi(p) {
  const narrations = Array.isArray(p.narrations) ? p.narrations : undefined;
  return {
    ...p,
    narrations,
    narration_locales: p.narration_locales ?? narrations?.map((n) => n.locale) ?? [],
  };
}

/** Lọc cục bộ theo cùng quy tắc BR02 (dùng cho mock và khi mất mạng, NFR02). */
export function filterPois(list, { q = '', categoryId = '' } = {}) {
  const key = normalizeText(q);
  return list.filter(
    (p) => (!categoryId || p.category_id === categoryId) && (!key || normalizeText(p.name).includes(key))
  );
}

export function createPublicApi({ client, useMock, style = 'v1' }) {
  const paths = PATHS[style] ?? PATHS.v1;
  return {
    async listCategories() {
      if (useMock) { await wait(120); return mockCategories; }
      return asList(await client.get(paths.categories));
    },
    async listPois({ q = '', categoryId = '' } = {}) {
      if (useMock) { await wait(200); return filterPois(mockPois, { q, categoryId }).map(normalizePoi); }
      const data = await client.get(paths.pois, { q: q.trim(), category_id: categoryId });
      return asList(data).map(normalizePoi);
    },
    async getPoi(id) {
      if (useMock) {
        await wait(150);
        const poi = mockPois.find((p) => p.id === id);
        if (!poi) throw Object.assign(new Error('Địa điểm không còn khả dụng.'), { status: 404, code: 'NOT_FOUND' });
        return normalizePoi(poi);
      }
      const data = await client.get(`${paths.pois}/${encodeURIComponent(id)}`);
      if (!data || !Array.isArray(data.narrations)) throw new ApiError('Phản hồi chi tiết không hợp lệ.', { code: 'INVALID_RESPONSE' });
      return normalizePoi(data);
    },
  };
}
