# Thiết kế API

[API_CONTRACT.md](../API_CONTRACT.md) là nguồn chung cho request, response, mã lỗi và trạng thái triển khai, cập nhật theo FastAPI ngày 02/11/2026. Không còn duy trì một bộ đường dẫn/response khác trong tài liệu này.

## Đã triển khai

- Public `GET /api/v1/categories`, `GET /api/v1/pois`, `GET /api/v1/pois/{id}`; danh sách bọc `items`, danh sách POI có `narration_locales`, chi tiết có `narrations`.
- `GET /api/v1/health` chỉ kiểm tra tiến trình.
- Admin login/me/logout dưới `/api/v1/admin`; danh mục dùng GET/POST/PATCH/DELETE dưới `/api/v1/admin/categories`.
- Quyền Admin được kiểm tra ở backend. Khách chỉ đọc POI published; draft/hidden không xuất hiện và chi tiết trả 404 như ID không tồn tại.
- Guest web và Admin là hai ứng dụng React riêng dùng proxy Vite khi phát triển; mobile Expo dùng adapter riêng.

## Chưa triển khai

API analytics/thu hồi, thống kê Admin, quản lý POI/thuyết minh/công bố và upload ảnh chưa có router. Đề xuất thống nhất dùng prefix `/api/v1` tại mục 6 của hợp đồng; không coi ví dụ thiết kế là endpoint khả dụng. Các đường dẫn cũ `/api/public`, `/api/admin/auth`, `analytics/withdraw` không dùng cho tích hợp mới.

Migration thống kê chỉ chuẩn hóa hai bảng SQLite, chưa hoàn thành WBS-08/WBS-09. Xem phần schema và nâng cấp an toàn trong hợp đồng và [backend README](../../backend/README.md).

Các giới hạn hiện tại: chưa phân trang; tìm kiếm Unicode lọc tên bằng Python trong bộ nhớ; chưa rate limiting/CORS cho origin độc lập; bản đồ/TTS guest web còn chờ tích hợp. Ngôn ngữ UI VI/EN độc lập với các ngôn ngữ bài thực tế.
