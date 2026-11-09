export class ApiError extends Error {
  constructor(code, status, details = []) { super(code); this.code = code; this.status = status; this.details = details; }
}

export async function request(path, { token, body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new ApiError('NETWORK_ERROR', 0); }
  if (!response.ok) {
    let data;
    try { data = await response.json(); } catch { /* Non-JSON server error. */ }
    throw new ApiError(data?.error?.code || 'SERVER_ERROR', response.status,
      Array.isArray(data?.error?.details) ? data.error.details : []);
  }
  return response.status === 204 ? null : response.json();
}

/** Gửi nguyên nội dung tệp (ảnh) làm body; backend kiểm tra loại và dung lượng. */
export async function upload(path, { token, file }) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: file,
    });
  } catch { throw new ApiError('NETWORK_ERROR', 0); }
  if (!response.ok) {
    let data;
    try { data = await response.json(); } catch { /* Non-JSON server error. */ }
    throw new ApiError(data?.error?.code || 'SERVER_ERROR', response.status, []);
  }
  return response.json();
}
