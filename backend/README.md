# Backend

FastAPI cung cấp xác thực Admin, quản lý danh mục, địa điểm, thuyết minh, API đọc công khai và UC12 heartbeat/revoke. Đường dẫn chuẩn `/api/v1/analytics/**`, giữ alias `/api/analytics/**`, cả hai trả 204 khi thành công. Có migration, seed và kiểm thử SQLite. Xem [hướng dẫn chạy](../RUNNING.md) và [hợp đồng API](../docs/API_CONTRACT.md).

Khởi động chỉ kiểm tra schema đang có (danh mục song ngữ, analytics version 2), không tự migration. Retention dọn lượt/phiên thống kê quá cửa sổ 30 ngày lúc khởi động và mỗi 00:00 Việt Nam khi API chạy; tác vụ lỗi ghi log/thử lại sau 60 giây. Không thay schema trong đợt tích hợp 04/11. Trước khi chạy với dữ liệu thật cần đọc chính sách này; kiểm thử luôn dùng database tạm, không seed lại database cá nhân.

DB mặc định và DB vận hành chính là `backend/data/saigon_stories.db`, nhận nguyên schema/dữ liệu của `local-dev.db` ngày 07/11/2026. Admin, Guest web và mobile cùng dùng DB này qua API. Lệnh `scripts/start-system.ps1` ở gốc repo chọn rõ DB chính và sao lưu trước khi bật. Chỉ ghi đè `SAIGON_DATABASE` khi chủ động dùng DB khác cho kiểm thử/phục hồi; `scripts/start_demo.py --database ...` vẫn dành cho lựa chọn DB riêng, không phải lệnh chạy mặc định. Chỉ dùng dữ liệu được nhóm duyệt cho demo; seed là nháp và placeholder. Sao lưu trước khi khởi động vì retention có ghi/xóa dữ liệu thống kê quá hạn.

Migration giữ nguyên ID và tên cũ, không tự dịch các danh mục sẵn có. Admin cần bổ sung tên tiếng Anh cho từng danh mục; trang khách dùng tên tiếng Việt khi bản dịch còn thiếu. Seed chỉ tạo bản dịch cho các dòng mẫu mới, không ghi đè dòng hiện có. Chi tiết ở [hướng dẫn danh mục](../docs/analysis-design/category-bilingual-preparation.md).

- `app/db/`: code kết nối và truy vấn SQLite.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: script khởi tạo và [dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: DB chính đang dùng; không đưa dữ liệu vận hành lên Git.

Hướng dẫn sao lưu và phục hồi nằm tại [docs/deployment/backup-restore.md](../docs/deployment/backup-restore.md).
