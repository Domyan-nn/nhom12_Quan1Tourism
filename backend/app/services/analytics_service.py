"""Dịch vụ thống kê ẩn danh (UC12, WBS-08).

Quy tắc áp dụng: BR13 (chỉ thu khi đồng ý), BR14 (lượt mới sau >= 30 phút),
BR15 (heartbeat), BR16 (ngày Asia/Ho_Chi_Minh, lưu UTC), BR17 (90 giây),
BR18 (rút đồng ý).

Các hàm nhận `conn` (sqlite3.Connection) và `now` để dễ kiểm thử; không phụ
thuộc cách app/db/connection.py tạo kết nối. Kết nối cần PRAGMA foreign_keys=ON
và nên đặt busy_timeout (vd. timeout=10 khi sqlite3.connect).
"""
from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
VISIT_GAP = timedelta(minutes=30)      # BR14
ACTIVE_WINDOW = timedelta(seconds=90)  # BR17
RETENTION_DAYS = 30                    # BR16 / mục 5.4

# Định dạng cố định 'YYYY-MM-DDTHH:MM:SS.mmmZ' (24 ký tự, mili giây) theo
# migrations/002_analytics_constraints.sql; so sánh chuỗi = so sánh thời gian.


class InvalidSessionId(ValueError):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def floor_ms(dt: datetime) -> datetime:
    """Cắt về mili giây (đúng độ chính xác lưu trong DB) để so sánh trong Python
    và trong SQL luôn nhất quán."""
    return dt.replace(microsecond=(dt.microsecond // 1000) * 1000)


def to_iso(dt: datetime) -> str:
    dt = floor_ms(dt.astimezone(timezone.utc))
    return f"{dt:%Y-%m-%dT%H:%M:%S}.{dt.microsecond // 1000:03d}Z"


def from_iso(text: str) -> datetime:
    return datetime.strptime(text, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)


def normalize_session_id(session_id: str) -> str:
    try:
        return str(uuid.UUID(session_id))
    except (ValueError, AttributeError, TypeError) as exc:
        raise InvalidSessionId("session_id phải là UUID") from exc


@contextmanager
def _immediate(conn: sqlite3.Connection):
    """Giao dịch ghi có khóa ngay từ đầu để các heartbeat đồng thời tuần tự hóa."""
    if conn.in_transaction:
        conn.commit()
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield
    except BaseException:
        conn.rollback()
        raise
    else:
        conn.commit()


def record_heartbeat(conn: sqlite3.Connection, session_id: str, now: datetime | None = None) -> dict:
    """Ghi tín hiệu. Trả {"status": "ok"|"revoked", "new_visit": bool}.

    - Phiên chưa có: tạo phiên + 1 lượt đầu.
    - Phiên có, last_seen cách >= 30 phút: thêm lượt mới.
    - Phiên đã rút (consent_granted=0): không làm gì, không kích hoạt lại.
    """
    sid = normalize_session_id(session_id)
    now = floor_ms(now or utcnow())
    now_iso = to_iso(now)
    with _immediate(conn):
        row = conn.execute(
            "SELECT consent_granted, last_seen_at FROM anonymous_sessions WHERE session_id = ?",
            (sid,),
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at) "
                "VALUES (?, 1, ?, ?)",
                (sid, now_iso, now_iso),
            )
            _insert_visit(conn, sid, now_iso)
            return {"status": "ok", "new_visit": True}
        consent, last_seen = row[0], from_iso(row[1])
        if consent == 0:
            return {"status": "revoked", "new_visit": False}
        new_visit = (now - last_seen) >= VISIT_GAP
        if new_visit:
            _insert_visit(conn, sid, now_iso)
        # không cho last_seen lùi nếu đồng hồ lệch
        conn.execute(
            "UPDATE anonymous_sessions SET last_seen_at = ? WHERE session_id = ? AND last_seen_at < ?",
            (now_iso, sid, now_iso),
        )
        return {"status": "ok", "new_visit": new_visit}


def _insert_visit(conn: sqlite3.Connection, sid: str, started_iso: str) -> None:
    conn.execute(
        "INSERT INTO visit_events (id, session_id, started_at) VALUES (?, ?, ?)",
        (str(uuid.uuid4()), sid, started_iso),
    )


def revoke_session(conn: sqlite3.Connection, session_id: str, now: datetime | None = None) -> dict:
    """Rút đồng ý (BR18). Idempotent: gọi lặp lại vẫn thành công.

    - Tách session_id khỏi mọi lượt đã ghi (tổng hợp theo ngày vẫn giữ).
    - Đánh dấu phiên consent_granted=0 (tombstone). Nếu phiên chưa tồn tại thì
      tạo tombstone để heartbeat đến muộn không tạo lại phiên.
    """
    sid = normalize_session_id(session_id)
    now_iso = to_iso(now or utcnow())
    with _immediate(conn):
        detached = conn.execute(
            "UPDATE visit_events SET session_id = NULL WHERE session_id = ?", (sid,)
        ).rowcount
        # Không đổi last_seen_at: ràng buộc last_seen_at >= created_at có thể bị vi phạm
        # nếu đồng hồ lệch, và tham chiếu trong schema_analytics.sql cũng chỉ đặt consent_granted=0.
        updated = conn.execute(
            "UPDATE anonymous_sessions SET consent_granted = 0 WHERE session_id = ?",
            (sid,),
        ).rowcount
        if updated == 0:
            conn.execute(
                "INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at) "
                "VALUES (?, 0, ?, ?)",
                (sid, now_iso, now_iso),
            )
    return {"revoked": True, "detached_visits": detached}


def count_active_sessions(conn: sqlite3.Connection, now: datetime | None = None) -> int:
    """BR17: phiên chưa rút, last_seen > now - 90s và không vượt now.
    (Dùng lại cho UC11 vào ngày 4.)"""
    now = floor_ms(now or utcnow())
    row = conn.execute(
        "SELECT COUNT(*) FROM anonymous_sessions "
        "WHERE consent_granted = 1 AND last_seen_at > ? AND last_seen_at <= ?",
        (to_iso(now - ACTIVE_WINDOW), to_iso(now)),
    ).fetchone()
    return row[0]


def retention_cutoff(now: datetime | None = None) -> datetime:
    """Mốc đầu của 'hôm nay - 29 ngày' theo giờ Việt Nam (tính cả hai đầu = 30 ngày)."""
    local = floor_ms(now or utcnow()).astimezone(VN_TZ)
    start_today = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return (start_today - timedelta(days=RETENTION_DAYS - 1)).astimezone(timezone.utc)


def cleanup_expired(conn: sqlite3.Connection, now: datetime | None = None) -> dict:
    """Xóa lượt và phiên quá hạn lưu giữ. Bản ghi đúng mốc cắt được giữ."""
    cutoff_iso = to_iso(retention_cutoff(now))
    with _immediate(conn):
        events = conn.execute(
            "DELETE FROM visit_events WHERE started_at < ?", (cutoff_iso,)
        ).rowcount
        # sự kiện bắt đầu <= last_seen nên phiên đã quá hạn không còn lượt trong hạn
        sessions = conn.execute(
            "DELETE FROM anonymous_sessions WHERE last_seen_at < ?", (cutoff_iso,)
        ).rowcount
    return {"visit_events_deleted": events, "sessions_deleted": sessions}


def vn_today(now: datetime | None = None):
    return floor_ms(now or utcnow()).astimezone(VN_TZ).date()


def _vn_day_start_utc(day) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=VN_TZ).astimezone(timezone.utc)


def visits_per_day(conn: sqlite3.Connection, start, end) -> list[dict]:
    """BR16: số lượt từng ngày Asia/Ho_Chi_Minh, tính cả hai đầu ngày."""
    days, day = [], start
    while day <= end:
        lo = to_iso(_vn_day_start_utc(day))
        hi = to_iso(_vn_day_start_utc(day + timedelta(days=1)))
        count = conn.execute(
            "SELECT COUNT(*) FROM visit_events WHERE started_at >= ? AND started_at < ?", (lo, hi)
        ).fetchone()[0]
        days.append({"date": day.isoformat(), "visits": count})
        day += timedelta(days=1)
    return days


def visit_stats(conn: sqlite3.Connection, start=None, end=None, now: datetime | None = None) -> dict:
    """UC10: hôm nay, 7 ngày gần nhất (gồm hôm nay) và khoảng tùy chọn trong 30 ngày."""
    today = vn_today(now)
    result = {
        "timezone": "Asia/Ho_Chi_Minh",
        "measured_at": to_iso(floor_ms(now or utcnow())),
        "today": visits_per_day(conn, today, today)[0]["visits"],
        "last_7_days": sum(d["visits"] for d in visits_per_day(conn, today - timedelta(days=6), today)),
        "range": None,
        "note": "Lượt truy cập tính theo mã phiên ẩn danh của khách đã đồng ý; không phải số người duy nhất.",
    }
    if start is not None and end is not None:
        days = visits_per_day(conn, start, end)
        result["range"] = {"from": start.isoformat(), "to": end.isoformat(),
                           "total": sum(d["visits"] for d in days), "days": days}
    return result


def valid_range(start, end, now: datetime | None = None) -> bool:
    """BR16: trong [hôm nay - 29 ngày, hôm nay] và start <= end."""
    today = vn_today(now)
    return start <= end and start >= today - timedelta(days=RETENTION_DAYS - 1) and end <= today


def active_snapshot(conn: sqlite3.Connection, now: datetime | None = None) -> dict:
    """UC11: ước lượng số phiên khách hoạt động (BR17, BR19)."""
    now = floor_ms(now or utcnow())
    return {
        "active_sessions": count_active_sessions(conn, now),
        "window_seconds": int(ACTIVE_WINDOW.total_seconds()),
        "measured_at": to_iso(now),
        "note": "Ước lượng theo mã phiên ẩn danh; không phải số người duy nhất.",
    }
