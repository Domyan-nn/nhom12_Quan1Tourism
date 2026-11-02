// Analytics API (UC12): heartbeat và revoke. Chỉ được gọi sau khi khách đồng ý (BR13).
// Ở chế độ mock không gọi mạng.

export function createAnalyticsApi({ client, useMock }) {
  return {
    async heartbeat(sessionId) {
      throw Object.assign(new Error('Analytics unavailable'), { code: 'UNSUPPORTED' });
    },
    async revoke(sessionId) {
      throw Object.assign(new Error('Analytics unavailable'), { code: 'UNSUPPORTED' });
    },
  };
}
