# API thống kê ẩn danh (UC12 – WBS-08)

Dành cho khách, không cần đăng nhập. Client chỉ gọi sau khi khách bấm Đồng ý (BR13).

| Endpoint | Body | Thành công | Lỗi |
|---|---|---|---|
| `POST /api/analytics/heartbeat` | `{"session_id": "<uuid>"}` | `204` | `409 {"detail":"session_revoked"}` nếu phiên đã rút; `422` nếu mã không phải UUID |
| `POST /api/analytics/revoke` | `{"session_id": "<uuid>"}` | `204` (idempotent) | `422` nếu mã không hợp lệ |

## Quy tắc xử lý (server)
- Giờ do server đặt (UTC, ISO 8601 `YYYY-MM-DDTHH:MM:SS.ffffffZ`); không nhận giờ từ client.
- Heartbeat chạy trong giao dịch `BEGIN IMMEDIATE`:
  - phiên mới → tạo `anonymous_sessions` + 1 `visit_events`;
  - `now - last_seen_at >= 30 phút` → thêm `visit_events`;
  - ngược lại chỉ cập nhật `last_seen_at` (không lùi).
- Revoke: `visit_events.session_id = NULL` cho mã đó; `anonymous_sessions.consent_granted = 0`
  (nếu chưa có phiên thì tạo bản ghi vô hiệu để heartbeat đến muộn không tạo lại phiên).
- Phiên đang hoạt động (UC11): `consent_granted = 1` và `last_seen_at > now - 90s`.
- Dọn dữ liệu: xóa `visit_events.started_at` và `anonymous_sessions.last_seen_at` nhỏ hơn
  00:00 giờ Asia/Ho_Chi_Minh của (hôm nay − 29 ngày). Bản ghi đúng mốc được giữ.
  Hàm: `analytics_service.cleanup_expired(conn, now)`.

## Client (guest-web)
`localStorage`: `ss.analytics.consent` (`granted`/`denied`), `ss.analytics.sid`, `ss.analytics.pendingRevoke`.
Heartbeat 30 giây khi `visibilityState === 'visible'` và online; rút đồng ý lưu `pendingRevoke`
trước khi xóa mã, chỉ xóa sau khi server trả 2xx.
