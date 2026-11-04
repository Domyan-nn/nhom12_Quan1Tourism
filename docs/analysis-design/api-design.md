# Thiết kế API

[API_CONTRACT.md](../API_CONTRACT.md) là nguồn chung cho request, response, mã lỗi và trạng thái triển khai, cập nhật theo FastAPI ngày 04/11/2026. Không còn duy trì một bộ đường dẫn/response khác trong tài liệu này.

## Đã triển khai

- Public `GET /api/v1/categories`, `GET /api/v1/pois`, `GET /api/v1/pois/{id}`; danh sách bọc `items`, danh sách POI có `narration_locales`, chi tiết có `narrations`.
- `GET /api/v1/health` chỉ kiểm tra tiến trình.
- Admin login/me/logout dưới `/api/v1/admin`; danh mục dùng GET/POST/PATCH/DELETE dưới `/api/v1/admin/categories`.
- Admin địa điểm và bài thuyết minh UC07–UC08 dưới `/api/v1/admin/pois`; tạo mới là draft, không tự công bố.
- Commit `aa0d2d7` của An bổ sung UC09 publish/hide và UC10–UC11 `/api/v1/admin/stats/visits`, `/active`, cùng Dashboard Admin; giữ nguyên khi ghép phần tích hợp này. Query lọc ngày là `date_from`, `date_to`; xem mục 9 trong hợp đồng.
- UC12 heartbeat/revoke dưới `/api/v1/analytics/**`, cùng alias `/api/analytics/**`; router chính dùng kết nối SQLite theo request. Retention chạy lúc khởi động và mỗi 00:00 Việt Nam khi API đang chạy.
- Quyền Admin được kiểm tra ở backend. Khách chỉ đọc POI published; draft/hidden không xuất hiện và chi tiết trả 404 như ID không tồn tại.
- Guest web và Admin là hai ứng dụng React riêng dùng proxy Vite khi phát triển; mobile Expo dùng adapter riêng.

## Chưa triển khai

Upload ảnh chưa có router và được loại khỏi tác vụ này. Các đường dẫn cũ `/api/public`, `/api/admin/auth`, `analytics/withdraw` không dùng cho tích hợp mới.

Migration thống kê hiện có đáp ứng tích hợp UC12, không thêm schema mới. Kết nối UC12 mobile vẫn chưa có. Xem phần schema, thời hạn dấu thu hồi và nâng cấp an toàn trong hợp đồng và [RUNNING](../../RUNNING.md).

Các giới hạn hiện tại: chưa phân trang; tìm kiếm Unicode lọc tên bằng Python trong bộ nhớ; chưa rate limiting/CORS cho origin độc lập. Bản đồ/TTS/UC12 guest đã nối; âm thanh thật, điện thoại và khả năng truy cập tile OSM cần kiểm chứng theo [báo cáo](../testing/integration-2026-11-04.md). Ngôn ngữ UI VI/EN độc lập với các ngôn ngữ bài thực tế.
