# API thống kê ẩn danh (UC12 – WBS-08)

Dành cho khách, không cần đăng nhập. Client chỉ gọi sau khi khách bấm Đồng ý (BR13).

| Endpoint | Body | Thành công | Lỗi |
|---|---|---|---|
| `POST /api/v1/analytics/heartbeat` | `{"session_id": "<uuid-v4>"}` | `204` | `409` với `detail: "session_revoked"` và envelope `error` nếu phiên đã rút; `422` nếu mã sai v4/variant |
| `POST /api/v1/analytics/revoke` | `{"session_id": "<uuid-v4>"}` | `204` (idempotent) | `422` nếu mã không hợp lệ |

Đã đăng ký trong FastAPI chính ngày 04/11/2026. Giữ `/api/analytics/**` làm alias tương thích. Hợp đồng chung ở [API_CONTRACT](../API_CONTRACT.md#5-analytics-uc12-đã-tích-hợp); heartbeat chỉ là khai báo của client sau đồng ý, không có endpoint tạo mã trước đồng ý.

## Quy tắc xử lý (server)
- Giờ do server đặt (UTC, ISO 8601 `YYYY-MM-DDTHH:MM:SS.mmmZ`, 24 ký tự); không nhận giờ từ client.
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
- FastAPI dọn lúc khởi động và tác vụ trong tiến trình dọn mỗi 00:00 Việt Nam khi API chạy; lỗi theo lịch ghi log và thử lại sau 60 giây. API tắt thì lần khởi động sau dọn bù. Đã kiểm thử vòng lịch bằng thời gian tiêm vào và SQLite tạm.
- Dấu thu hồi có cùng thời hạn theo `last_seen_at`, không được gia hạn khi revoke. Sau khi dọn quá hạn, server không còn nhớ mã cũ; đồng ý lại phía client phải dùng mã mới.

## Client (guest-web)
`localStorage`: `ss.analytics.consent` (`granted`/`denied`), `ss.analytics.sid`, `ss.analytics.pendingRevoke`.
Heartbeat 30 giây khi `visibilityState === 'visible'` và online; rút đồng ý lưu `pendingRevoke`
trước khi xóa mã, chỉ xóa sau khi server trả 2xx.

Đã nối banner và PrivacySettings VI/EN. Base mặc định `/api/v1`, không ghép thêm `/api`. Một vòng đời ở AppLayout, các điều khiển chỉ đọc trạng thái. Revoke lỗi được thử lại mỗi 30 giây, khi online/visible/khởi động; khóa đồng ý lại khi còn mã chờ. Phản hồi heartbeat 409 cũ không được tắt lần đồng ý mới; phản hồi revoke cũ không được xóa yêu cầu chờ mới. Chế độ mock không sinh/gửi thống kê. Nếu localStorage bị chặn thì dừng gửi, báo lỗi; mã chờ trong bộ nhớ có thể mất khi đóng trang.

Mobile vẫn chưa nối API (`UNSUPPORTED`); thông báo đã sửa để không còn nói máy chủ chưa có API. Không coi test lõi privacy mobile với API giả là bằng chứng gửi/rút thống kê thật.
