// Máy khách HTTP mỏng: timeout, ánh xạ lỗi theo định dạng lỗi của API_CONTRACT mục 3.

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function createApiClient({ baseUrl, fetchImpl = fetch, timeoutMs = 10_000 }) {
  async function request(method, path, { params, body } = {}) {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}${qs ? `?${qs}` : ''}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('Không kết nối được tới máy chủ.', { status: 0, code: 'NETWORK_ERROR' });
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 204) return null;
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* thân rỗng hoặc không phải JSON */
    }
    if (!res.ok) {
      throw new ApiError(data?.error?.message ?? 'Máy chủ trả về lỗi.', {
        status: res.status,
        code: data?.error?.code ?? 'HTTP_ERROR',
      });
    }
    return data;
  }
  return {
    get: (path, params) => request('GET', path, { params }),
    post: (path, body) => request('POST', path, { body }),
  };
}
