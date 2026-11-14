# Thiết kế dữ liệu dự kiến

Theo PRD, SQLite có các bảng `admin_accounts`, `admin_sessions`, `categories`, `pois`, `poi_narrations`, `anonymous_sessions` và `visit_events`.

- Một danh mục có nhiều địa điểm; không xóa danh mục đang được sử dụng.
- Một địa điểm có nhiều bài thuyết minh; cặp `(poi_id, locale)` duy nhất. Xóa địa điểm xử lý các bài liên quan.
- Một tài khoản Admin có thể có nhiều phiên; một phiên khách ẩn danh có thể gắn với nhiều lượt. Sau khi rút đồng ý, các lượt cũ không còn gắn mã phiên.
- Theo PRD, UUID và thời gian UTC ISO 8601 lưu dạng `TEXT`, giá trị logic dùng `INTEGER` 0/1. Tổng hợp ngày thống kê theo `Asia/Ho_Chi_Minh`.
- Bật kiểm tra khóa ngoại cho mỗi kết nối SQLite. Điều kiện công bố và xử lý heartbeat đồng thời cần được kiểm tra trong giao dịch nghiệp vụ.

Schema lịch sử nằm tại `backend/migrations/001_initial.sql`; `init_db.py` chạy lần lượt `001` → `005` (thống kê 002, danh mục song ngữ 003, ghi công ảnh 004, nhật ký Admin 005) nên database mới có `user_version=5`; xem [migrations/README.md](../../backend/migrations/README.md). Script từ chối database đã có bảng hoặc view. Database cũ cần dùng `scripts/migrate_db.py --check` rồi áp dụng với backup mới, xem [backend README](../../backend/README.md#nâng-cấp-schema-thống-kê). `backend/data/schema_analytics.sql` chỉ là truy vấn tham chiếu; CREATE TABLE IF NOT EXISTS không nâng cấp ràng buộc bảng cũ. Tệp database cục bộ không được lưu vào Git.

Hai bảng analytics kiểm tra UUID v4 chữ thường, thời gian UTC đủ 24 ký tự với ngày/giờ hợp lệ, consent INTEGER 0/1 và thứ tự created/last_seen. visit_events.session_id cho phép NULL hoặc tham chiếu phiên tồn tại, ON DELETE SET NULL; ba chỉ mục chuẩn được tạo trong 002. Migration không tự chuẩn hóa hoặc xóa dữ liệu sai; lỗi gây rollback. API analytics, dọn dữ liệu và Dashboard đã tích hợp; xem [hợp đồng](../API_CONTRACT.md).

API danh mục chuẩn hóa tên bằng trim, Unicode NFC và casefold; kiểm tra trùng dựa vào ràng buộc database. Publish kiểm tra locale/bài hợp lệ và dữ liệu POI trong giao dịch `BEGIN IMMEDIATE`; heartbeat, revoke và retention cũng dùng giao dịch để tránh kết quả đua. SQLite không tự bật khóa ngoại cho mọi kết nối, nên module kết nối backend bật `PRAGMA foreign_keys = ON` khi mở từng kết nối. Không đổi schema trong đợt bàn giao 06/11.

Từ điển trường, khóa, CHECK, chỉ mục và ánh xạ PRD được đối chiếu trong [data-dictionary.md](data-dictionary.md). Hướng dẫn [sao lưu/phục hồi](../deployment/backup-restore.md) sử dụng snapshot SQLite vào tệp mới, không chép đè database đang dùng.
