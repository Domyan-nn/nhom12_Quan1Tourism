# Backend

FastAPI cung cấp xác thực Admin, quản lý danh mục, địa điểm, thuyết minh và API đọc công khai. Có migration, seed và kiểm thử SQLite. Xem [hướng dẫn chạy](../RUNNING.md).

Database demo preview có dữ liệu thử nghiệm `published`, chưa phải nội dung đã kiểm duyệt. Database `backend/data/saigon_stories.db` dành cho dữ liệu chính.

Migration giữ nguyên ID và tên cũ, không tự dịch các danh mục sẵn có. Admin cần bổ sung tên tiếng Anh cho từng danh mục; trang khách dùng tên tiếng Việt khi bản dịch còn thiếu. Seed chỉ tạo bản dịch cho các dòng mẫu mới, không ghi đè dòng hiện có. Chi tiết ở [hướng dẫn danh mục](../docs/analysis-design/category-bilingual-preparation.md).

- `app/db/`: code kết nối và truy vấn SQLite.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: script khởi tạo và [dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: vị trí dự kiến cho tệp SQLite cục bộ; không đưa dữ liệu vận hành lên Git.

Hướng dẫn sao lưu và phục hồi nằm tại [docs/deployment/backup-restore.md](../docs/deployment/backup-restore.md).
