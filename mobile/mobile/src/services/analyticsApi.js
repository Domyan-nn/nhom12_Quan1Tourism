// Analytics API (UC12): heartbeat và revoke. Chỉ được gọi sau khi khách đồng ý (BR13).
// Ở chế độ mock không gọi mạng.

export function createAnalyticsApi({ client, useMock }) {
  return {
    async heartbeat(sessionId) {
      if (useMock) return { session_id: sessionId, visit_recorded: false };
      return client.post('/analytics/heartbeat', { session_id: sessionId });
    },
    async revoke(sessionId) {
      if (useMock) return null;
      await client.post('/analytics/revoke', { session_id: sessionId }); // 204
      return null;
    },
  };
}
