-- Nhật ký thao tác Admin (phần mở rộng C): mỗi thao tác quản trị THÀNH CÔNG ghi một dòng.
-- Chạy qua scripts/migrate_005_admin_audit_log.py (DB cũ) hoặc scripts/init_db.py (DB mới), không chạy trực tiếp.
-- user_version = 5 nghĩa là đã có 001 -> 005. admin_id dùng RESTRICT: tài khoản đã có nhật ký không bị xóa, chỉ khóa (is_active = 0).
CREATE TABLE admin_audit_log (
    id TEXT NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    admin_id TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE RESTRICT,
    action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 50),
    target_type TEXT CHECK (target_type IS NULL OR length(target_type) BETWEEN 1 AND 30),
    target_id TEXT CHECK (target_id IS NULL OR length(target_id) BETWEEN 1 AND 64),
    summary TEXT CHECK (summary IS NULL OR length(summary) BETWEEN 1 AND 200),
    created_at TEXT NOT NULL CHECK (length(created_at) BETWEEN 19 AND 40)
);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log (created_at);
PRAGMA user_version = 5;
