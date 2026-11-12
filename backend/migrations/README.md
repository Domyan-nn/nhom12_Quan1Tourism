# Migration SQLite

Thứ tự áp dụng và cách nhận diện từng bước. API không tự migration; khi khởi động chỉ kiểm tra schema và từ chối DB thiếu bước nào (`app/db/connection.py`).

| Tệp | Nội dung | Chạy bằng | Nhận diện đã áp dụng |
| --- | --- | --- | --- |
| `001_initial.sql` | Bảy bảng theo PRD mục 7.1 | `scripts/init_db.py` (chỉ DB mới, trống) | Có bảng `categories`, `pois`… |
| `002_analytics_constraints.sql` | Dựng lại `anonymous_sessions`, `visit_events` với CHECK chặt cho UUID/thời gian | `scripts/migrate_db.py --database <db> --backup <tệp mới>` | `PRAGMA user_version = 2` |
| `003_category_bilingual.sql` | Thêm `name_en`, `normalized_name_en` và chỉ mục duy nhất | `scripts/prepare_category_bilingual.py --database <db> --backup <tệp mới>` | Có cột `categories.name_en` |
| `004_poi_image_credit.sql` | Thêm `pois.image_credit` (ghi công ảnh) | `scripts/migrate_004_poi_image_credit.py --database <db> --backup <tệp mới>` | `PRAGMA user_version = 4` |
| `005_admin_audit_log.sql` | Thêm bảng `admin_audit_log` (nhật ký thao tác Admin, phần mở rộng C) | `scripts/migrate_005_admin_audit_log.py --database <db> --backup <tệp mới>` | `PRAGMA user_version = 5` |

`init_db.py` áp dụng đủ 001 → 002 → 003 → 004 → 005 cho DB mới. DB cũ: chạy `--check` trước (thử trên bản sao trong bộ nhớ, không đổi tệp), rồi chạy kèm `--backup` tới một tệp chưa tồn tại. Mỗi runner kiểm tra `integrity_check` và `foreign_key_check` trước/sau và rollback toàn bộ nếu lỗi.

Từ migration 004, `user_version` là phiên bản schema chung: 4 nghĩa là đã có 001 → 004. API khởi động yêu cầu `user_version` ít nhất 5, có cột `pois.image_credit` và bảng `admin_audit_log`; DB phiên bản 2 bị từ chối kèm hướng dẫn chạy script 004, DB phiên bản 4 bị từ chối kèm hướng dẫn chạy script 005. Migration tiếp theo đặt `user_version = 6` và nâng mức yêu cầu trong `app/db/connection.py::validate_schema_version`. `admin_audit_log.admin_id` dùng `ON DELETE RESTRICT`: tài khoản đã có nhật ký không xóa được, chỉ khóa bằng `is_active = 0`.
