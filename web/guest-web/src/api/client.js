export class ApiError extends Error {
  constructor(message, status, code = 'HTTP_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function createApiGet({ baseUrl = '/api/v1', fetchImpl = globalThis.fetch } = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  return async function apiGet(path, params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    let res;
    try {
      res = await fetchImpl(`${base}${path}${qs ? `?${qs}` : ''}`);
    } catch {
      throw new ApiError('Không kết nối được tới máy chủ.', 0, 'NETWORK_ERROR');
    }
    let data;
    try { data = await res.json(); } catch {
      if (res.ok) throw new ApiError('Phản hồi không hợp lệ.', res.status, 'INVALID_RESPONSE');
    }
    if (!res.ok) throw new ApiError(data?.error?.message || 'Máy chủ trả về lỗi.', res.status, data?.error?.code);
    return data;
  };
}
