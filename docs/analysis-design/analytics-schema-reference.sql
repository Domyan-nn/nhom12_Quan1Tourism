-- =====================================================================
-- Saigon Stories Quận 1 – Schema thống kê ẩn danh (PRD mục 7.1.6, 7.1.7)
-- REFERENCE ONLY: DDL thống nhất tại backend/migrations/002_analytics_constraints.sql.
-- Database mới: chạy backend/scripts/init_db.py (001 rồi 002).
-- Database cũ: backend/scripts/migrate_db.py --database <file> --check, rồi
--             --database <file> --backup <file-backup-moi>.
-- Không chạy CREATE TABLE IF NOT EXISTS để nâng cấp: lệnh đó không bổ sung
-- CHECK cho bảng đã tồn tại. Tệp này chỉ giữ truy vấn thiết kế, không tạo bảng.
-- Schema/migration không đồng nghĩa WBS-08/WBS-09, API hay dashboard đã xong.
-- Quy ước (PRD 5.6): UUID lưu TEXT; thời gian lưu TEXT theo ISO 8601 UTC,
-- ĐỊNH DẠNG CỐ ĐỊNH 'YYYY-MM-DDTHH:MM:SS.mmmZ' (độ dài 24) để so sánh chuỗi
-- đúng thứ tự thời gian; giá trị logic lưu INTEGER 0/1.
-- Mỗi kết nối phải chạy:  PRAGMA foreign_keys = ON;  (NFR03)
-- =====================================================================

-- 002 kiểm tra UUID v4 chữ thường chuẩn cho session_id/id, INTEGER 0/1 cho
-- consent_granted (mặc định 1), UTC hợp lệ đủ 24 ký tự, last_seen >= created.
-- visit_events.session_id cho phép NULL, còn lại phải tham chiếu phiên tồn tại;
-- ON DELETE SET NULL. Chỉ mục chuẩn: idx_anonymous_sessions_last_seen_at,
-- idx_visit_events_session_id, idx_visit_events_started_at.

-- =====================================================================
-- TRUY VẤN THAM CHIẾU (tham số dạng :tên). Thời điểm :now, :cutoff… do
-- BACKEND tính bằng giờ máy chủ UTC, KHÔNG nhận từ client.
-- =====================================================================

-- [HEARTBEAT – BR14, BR15] Chạy trong một giao dịch:  BEGIN IMMEDIATE;
--  1) SELECT consent_granted, last_seen_at FROM anonymous_sessions WHERE session_id = :sid;
--  2) Không có dòng  -> INSERT phiên (consent_granted=1, created_at=last_seen_at=:now)
--                       và INSERT visit_events (lượt đầu).
--     consent_granted = 0 -> ROLLBACK, trả 409 SESSION_REVOKED (không ghi gì).
--     Có dòng, last_seen_at <= :gap_cutoff (= :now − 30 phút) -> INSERT visit_events (lượt mới).
--     Còn lại -> không tạo lượt.
--  3) UPDATE anonymous_sessions SET last_seen_at = :now WHERE session_id = :sid AND consent_granted = 1;
--  COMMIT;
-- Lượt mới khi: last_seen_at <= :gap_cutoff  ("từ 30 phút không có tín hiệu").

-- [RÚT ĐỒNG Ý – BR18] Một giao dịch, idempotent:
--  INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at)
--       VALUES (:sid, 0, :now, :now)
--  ON CONFLICT (session_id) DO UPDATE SET consent_granted = 0;
--  UPDATE visit_events SET session_id = NULL WHERE session_id = :sid;
-- (Giữ dòng consent_granted=0 làm "bia mộ" để heartbeat đến muộn không tạo lại phiên.)

-- [ĐANG HOẠT ĐỘNG – BR17]
--  SELECT COUNT(*) FROM anonymous_sessions
--   WHERE consent_granted = 1 AND last_seen_at > :now_minus_90s AND last_seen_at <= :now;

-- [LƯỢT THEO NGÀY VN – BR16]  :from_utc / :to_utc_exclusive là mốc 00:00 giờ VN đã đổi sang UTC
--  SELECT date(started_at, '+7 hours') AS day, COUNT(*) AS visits
--    FROM visit_events
--   WHERE started_at >= :from_utc AND started_at < :to_utc_exclusive
--   GROUP BY day ORDER BY day;

-- [DỌN DỮ LIỆU – 30 ngày theo ngày VN] :keep_from_utc = 00:00 VN của (hôm nay − 29 ngày) đổi sang UTC
--  DELETE FROM visit_events WHERE started_at < :keep_from_utc;
--  DELETE FROM anonymous_sessions WHERE last_seen_at < :keep_from_utc;
