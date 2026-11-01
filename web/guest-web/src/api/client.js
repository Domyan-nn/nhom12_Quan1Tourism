const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`);
  } catch {
    throw new ApiError('Không kết nối được tới máy chủ.', 0);
  }
  if (!res.ok) throw new ApiError('Máy chủ trả về lỗi.', res.status);
  return res.json();
}
