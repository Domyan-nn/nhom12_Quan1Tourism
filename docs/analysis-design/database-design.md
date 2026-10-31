# Thiết kế dữ liệu dự kiến

Theo PRD, SQLite có các bảng `admin_accounts`, `admin_sessions`, `categories`, `pois`, `poi_narrations`, `anonymous_sessions` và `visit_events`.

- Một danh mục có nhiều địa điểm; không xóa danh mục đang được sử dụng.
- Một địa điểm có nhiều bài thuyết minh; cặp `(poi_id, locale)` duy nhất. Xóa địa điểm xử lý các bài liên quan.
- Một tài khoản Admin có thể có nhiều phiên; một phiên khách ẩn danh có thể gắn với nhiều lượt. Sau khi rút đồng ý, các lượt cũ không còn gắn mã phiên.
- Theo PRD, UUID và thời gian UTC ISO 8601 lưu dạng `TEXT`, giá trị logic dùng `INTEGER` 0/1. Tổng hợp ngày thống kê theo `Asia/Ho_Chi_Minh`.
- Bật kiểm tra khóa ngoại cho mỗi kết nối SQLite. Điều kiện công bố và xử lý heartbeat đồng thời cần được kiểm tra trong giao dịch nghiệp vụ.

Cần bổ sung ERD, migration và mô tả quyết định thực tế khi triển khai. Tệp `backend/data/saigon_stories.db` hiện có 0 byte và chưa phải cơ sở dữ liệu đã khởi tạo.
