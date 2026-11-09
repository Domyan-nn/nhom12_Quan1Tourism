# Migration SQLite

Thứ tự áp dụng và cách nhận diện từng bước. API không tự migration; khi khởi động chỉ kiểm tra schema và từ chối DB thiếu bước nào (`app/db/connection.py`).

| Tệp | Nội dung | Chạy bằng | Nhận diện đã áp dụng |
| --- | --- | --- | --- |
| `001_initial.sql` | Bảy bảng theo PRD mục 7.1 | `scripts/init_db.py` (chỉ DB mới, trống) | Có bảng `categories`, `pois`… |
| `002_analytics_constraints.sql` | Dựng lại `anonymous_sessions`, `visit_events` với CHECK chặt cho UUID/thời gian | `scripts/migrate_db.py --database <db> --backup <tệp mới>` | `PRAGMA user_version = 2` |
| `003_category_bilingual.sql` | Thêm `name_en`, `normalized_name_en` và chỉ mục duy nhất | `scripts/prepare_category_bilingual.py --database <db> --backup <tệp mới>` | Có cột `categories.name_en` |

`init_db.py` áp dụng đủ 001 → 002 → 003 cho DB mới. DB cũ: chạy `--check` trước (thử trên bản sao trong bộ nhớ, không đổi tệp), rồi chạy kèm `--backup` tới một tệp chưa tồn tại. Mỗi runner kiểm tra `integrity_check` và `foreign_key_check` trước/sau và rollback toàn bộ nếu lỗi.

`user_version` hiện chỉ đánh dấu bước 002 vì 003 được thêm sau, khi các DB của nhóm đã có cột song ngữ. Migration mới nên đặt `PRAGMA user_version = 4` và cập nhật kiểm tra khởi động, để từ đó phiên bản schema chỉ đọc từ một chỗ.
