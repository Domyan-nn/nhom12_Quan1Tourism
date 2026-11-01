-- =====================================================================
-- Saigon Stories Quận 1 – Schema thống kê ẩn danh (PRD mục 7.1.6, 7.1.7)
-- Phụ trách: Nguyễn Quốc An (WBS-08, WBS-09). Nguyên gộp vào schema chung.
-- Quy ước (PRD 5.6): UUID lưu TEXT; thời gian lưu TEXT theo ISO 8601 UTC,
-- ĐỊNH DẠNG CỐ ĐỊNH 'YYYY-MM-DDTHH:MM:SS.mmmZ' (độ dài 24) để so sánh chuỗi
-- đúng thứ tự thời gian; giá trị logic lưu INTEGER 0/1.
-- Mỗi kết nối phải chạy:  PRAGMA foreign_keys = ON;  (NFR03)
-- =====================================================================

-- 7.1.6  Phiên khách đã đồng ý thống kê. Không chứa thông tin nhận diện.
CREATE TABLE IF NOT EXISTS anonymous_sessions (
    session_id       TEXT PRIMARY KEY NOT NULL
                     CHECK (length(session_id) = 36),          -- UUID v4 do client sinh
    consent_granted  INTEGER NOT NULL DEFAULT 1
                     CHECK (consent_granted IN (0, 1)),        -- 0 = đã rút đồng ý
    created_at       TEXT NOT NULL CHECK (length(created_at) = 24),
    last_seen_at     TEXT NOT NULL CHECK (length(last_seen_at) = 24),
    CHECK (last_seen_at >= created_at)
);

-- Đếm "số khách đang hoạt động" (BR17) và dọn phiên cũ.
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_last_seen
    ON anonymous_sessions (last_seen_at);

-- 7.1.7  Lượt truy cập ẩn danh. session_id = NULL sau khi khách rút đồng ý (BR18).
CREATE TABLE IF NOT EXISTS visit_events (
    id          TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    session_id  TEXT NULL
                REFERENCES anonymous_sessions (session_id) ON DELETE SET NULL,
    started_at  TEXT NOT NULL CHECK (length(started_at) = 24)
);

-- Tổng hợp theo ngày VN và dọn quá 30 ngày (BR16).
CREATE INDEX IF NOT EXISTS idx_visit_events_started_at
    ON visit_events (started_at);
-- Khóa ngoại phía con: cần cho UPDATE ... SET session_id = NULL khi rút đồng ý.
CREATE INDEX IF NOT EXISTS idx_visit_events_session
    ON visit_events (session_id);

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
