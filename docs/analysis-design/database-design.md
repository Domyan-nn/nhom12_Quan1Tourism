# Thiết kế dữ liệu dự kiến

Theo PRD, SQLite có các bảng `admin_accounts`, `admin_sessions`, `categories`, `pois`, `poi_narrations`, `anonymous_sessions` và `visit_events`.

- Một danh mục có nhiều địa điểm; không xóa danh mục đang được sử dụng.
- Một địa điểm có nhiều bài thuyết minh; cặp `(poi_id, locale)` duy nhất. Xóa địa điểm xử lý các bài liên quan.
- Một tài khoản Admin có thể có nhiều phiên; một phiên khách ẩn danh có thể gắn với nhiều lượt. Sau khi rút đồng ý, các lượt cũ không còn gắn mã phiên.
- Theo PRD, UUID và thời gian UTC ISO 8601 lưu dạng `TEXT`, giá trị logic dùng `INTEGER` 0/1. Tổng hợp ngày thống kê theo `Asia/Ho_Chi_Minh`.
- Bật kiểm tra khóa ngoại cho mỗi kết nối SQLite. Điều kiện công bố và xử lý heartbeat đồng thời cần được kiểm tra trong giao dịch nghiệp vụ.

Schema ban đầu nằm tại `backend/migrations/001_initial.sql`; dùng `python backend/scripts/init_db.py` từ thư mục gốc để khởi tạo database mới. Script từ chối database đã có bảng hoặc view để tránh ghi đè. Tệp database cục bộ không được lưu vào Git.

Backend vẫn cần thực hiện các quy tắc liên bảng: chuẩn hóa tên danh mục bằng trim, Unicode NFC và casefold; kiểm tra locale và ít nhất một bài hợp lệ trước khi công bố; xác thực thời gian UTC ISO 8601 cùng một định dạng; xử lý đồng thời heartbeat, rút đồng ý và xóa dữ liệu quá hạn trong giao dịch. SQLite không tự bật khóa ngoại cho mọi kết nối, nên backend phải bật `PRAGMA foreign_keys = ON` khi mở từng kết nối. Schema này chưa triển khai API hoặc các quy tắc nghiệp vụ đó.
