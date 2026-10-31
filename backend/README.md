# Backend

Thư mục dành cho ứng dụng FastAPI, SQLite, migration, script và kiểm thử. Backend chưa được triển khai. Các nhóm `api`, `services`, `models` và `schemas` phân chia trách nhiệm như mô tả trong README gốc.

- `app/db/`: code kết nối SQLite; `app/models/`: định nghĩa các bảng.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: các script vận hành và dữ liệu mẫu dự kiến; xem [hướng dẫn dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: vị trí dự kiến cho tệp SQLite cục bộ; không đưa dữ liệu vận hành lên Git.

Sau khi triển khai, bổ sung cách khởi tạo, nạp dữ liệu mẫu, sao lưu và phục hồi đã được kiểm chứng.

## Khởi tạo database

Từ thư mục gốc, chạy `python backend/scripts/init_db.py` với Python có sẵn module chuẩn `sqlite3`. Script chạy `migrations/001_initial.sql` và từ chối database đã có bảng hoặc view; không xóa hay ghi đè dữ liệu. Có thể chọn tệp khác bằng `--database DUONG_DAN`. Sau khi khởi tạo cần bật khóa ngoại trên từng kết nối backend; xem `docs/analysis-design/database-design.md`.
