# Backend

Thư mục dành cho ứng dụng FastAPI, SQLite, migration, script và kiểm thử. Backend chưa được triển khai. Các nhóm `api`, `services`, `models` và `schemas` phân chia trách nhiệm như mô tả trong README gốc.

- `app/db/`: code kết nối SQLite; `app/models/`: định nghĩa các bảng.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: các script vận hành và dữ liệu mẫu dự kiến; xem [hướng dẫn dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: vị trí duy nhất dự kiến cho tệp SQLite cục bộ. Tệp hiện có rỗng và chưa được khởi tạo; không đưa dữ liệu vận hành lên Git.

Sau khi triển khai, bổ sung cách khởi tạo, nạp dữ liệu mẫu, sao lưu và phục hồi đã được kiểm chứng.
