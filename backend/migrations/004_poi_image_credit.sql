-- Ghi công ảnh địa điểm (tác giả, giấy phép, nguồn) cho ảnh tải lên hoặc ảnh từ URL.
-- Chạy qua scripts/migrate_004_poi_image_credit.py (DB cũ) hoặc scripts/init_db.py (DB mới), không chạy trực tiếp.
-- Từ bước này user_version đánh dấu phiên bản schema chung: 4 = 001 + 002 + 003 + 004.
ALTER TABLE pois ADD COLUMN image_credit TEXT CHECK (image_credit IS NULL OR length(trim(image_credit)) BETWEEN 1 AND 300);
PRAGMA user_version = 4;
