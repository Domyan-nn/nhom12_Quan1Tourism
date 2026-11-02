export class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
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
    throw new ApiError(data?.error?.code || 'SERVER_ERROR', response.status);
  }
  return response.status === 204 ? null : response.json();
}
