// Analytics API (UC12): heartbeat và revoke. Chỉ được gọi sau khi khách đồng ý (BR13).
// Backend: POST /api/v1/analytics/heartbeat|revoke với {"session_id": UUID v4} -> 204.
// Heartbeat trả 409 khi phiên đã rút (AnalyticsClient dựa vào status 409 để dừng gửi).
// Ở chế độ mock không gọi mạng.

const BASES = { v1: '/v1/analytics', contract: '/analytics' };

export function createAnalyticsApi({ client, useMock, style = 'v1' }) {
  const base = BASES[style] ?? BASES.v1;
  return {
    async heartbeat(sessionId) {
      if (useMock) throw Object.assign(new Error('Analytics is unavailable in mock mode.'), { code: 'UNSUPPORTED' });
      await client.post(`${base}/heartbeat`, { session_id: sessionId });
      return null;
    },
    async revoke(sessionId) {
      if (useMock) throw Object.assign(new Error('Analytics is unavailable in mock mode.'), { code: 'UNSUPPORTED' });
      await client.post(`${base}/revoke`, { session_id: sessionId });
      return null;
    },
  };
}
