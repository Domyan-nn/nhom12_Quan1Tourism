-- Tên tiếng Anh cho danh mục (giao diện khách VI/EN). Chạy qua scripts/prepare_category_bilingual.py,
-- không chạy trực tiếp: runner kiểm tra cột, toàn vẹn và khóa ngoại trước/sau, lỗi thì rollback toàn bộ.
-- Dòng cũ giữ name_en = NULL; không tự dịch. user_version chỉ theo dõi analytics (002), nên
-- migration này được nhận diện qua cột categories.name_en (xem migrations/README.md).
ALTER TABLE categories ADD COLUMN name_en TEXT CHECK (name_en IS NULL OR length(trim(name_en)) > 0);
ALTER TABLE categories ADD COLUMN normalized_name_en TEXT CHECK (normalized_name_en IS NULL OR length(trim(normalized_name_en)) > 0);
CREATE UNIQUE INDEX idx_categories_normalized_name_en ON categories(normalized_name_en) WHERE normalized_name_en IS NOT NULL;
