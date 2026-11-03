"""Kiểm thử UC12 / WBS-08 (BR13–BR16, BR18). Chạy từ thư mục backend/:
    python -m pytest tests/test_analytics.py
"""
import sqlite3
import sys
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.api.routes import analytics as analytics_routes
from app.services import analytics_service as svc

SID = "3f2b1c9e-8a44-4d51-9b0c-6a1f2e7d9c10"
SID2 = "a1b2c3d4-0000-4000-8000-000000000002"
T0 = datetime(2026, 11, 3, 3, 0, 0, tzinfo=timezone.utc)  # 10:00 giờ VN

MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "001_initial.sql"
FALLBACK_DDL = """
CREATE TABLE anonymous_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  consent_granted INTEGER NOT NULL CHECK (consent_granted IN (0,1)),
  created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
CREATE INDEX idx_anon_last_seen ON anonymous_sessions(last_seen_at);
CREATE TABLE visit_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT REFERENCES anonymous_sessions(session_id) ON DELETE SET NULL,
  started_at TEXT NOT NULL);
CREATE INDEX idx_visit_started ON visit_events(started_at);
"""


def open_db(path) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "t.db"
    conn = open_db(path)
    # Ưu tiên schema thật của dự án để phát hiện lệch tên cột/bảng
    conn.executescript(MIGRATION.read_text(encoding="utf-8") if MIGRATION.exists() else FALLBACK_DDL)
    conn.close()
    return path


@pytest.fixture
def conn(db_path):
    c = open_db(db_path)
    yield c
    c.close()


def visits(conn, sid=None):
    if sid:
        return conn.execute("SELECT COUNT(*) FROM visit_events WHERE session_id=?", (sid,)).fetchone()[0]
    return conn.execute("SELECT COUNT(*) FROM visit_events").fetchone()[0]


# ---- Heartbeat / lượt truy cập (BR14) ----

def test_first_heartbeat_creates_session_and_one_visit(conn):
    r = svc.record_heartbeat(conn, SID, T0)
    assert r == {"status": "ok", "new_visit": True}
    assert visits(conn, SID) == 1


def test_continuous_heartbeats_do_not_add_visits(conn):
    svc.record_heartbeat(conn, SID, T0)
    for i in range(1, 10):
        r = svc.record_heartbeat(conn, SID, T0 + timedelta(seconds=30 * i))
        assert r["new_visit"] is False
    assert visits(conn) == 1


def test_gap_just_under_30_minutes_is_same_visit(conn):
    svc.record_heartbeat(conn, SID, T0)
    r = svc.record_heartbeat(conn, SID, T0 + timedelta(minutes=30) - timedelta(seconds=1))
    assert r["new_visit"] is False and visits(conn) == 1


def test_gap_of_exactly_30_minutes_starts_new_visit(conn):
    svc.record_heartbeat(conn, SID, T0)
    r = svc.record_heartbeat(conn, SID, T0 + timedelta(minutes=30))
    assert r["new_visit"] is True and visits(conn) == 2


def test_last_seen_never_moves_backwards(conn):
    svc.record_heartbeat(conn, SID, T0 + timedelta(seconds=60))
    svc.record_heartbeat(conn, SID, T0)  # đồng hồ lệch
    last = conn.execute("SELECT last_seen_at FROM anonymous_sessions").fetchone()[0]
    assert last == svc.to_iso(T0 + timedelta(seconds=60))


def test_invalid_session_id_rejected(conn):
    with pytest.raises(svc.InvalidSessionId):
        svc.record_heartbeat(conn, "not-a-uuid", T0)
    assert visits(conn) == 0


def test_concurrent_heartbeats_create_single_visit(db_path):
    errors = []

    def worker():
        c = open_db(db_path)
        try:
            svc.record_heartbeat(c, SID, T0)
        except Exception as exc:  # pragma: no cover
            errors.append(exc)
        finally:
            c.close()

    threads = [threading.Thread(target=worker) for _ in range(8)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert not errors
    c = open_db(db_path)
    assert visits(c) == 1
    c.close()


# ---- Rút đồng ý (BR18) ----

def test_revoke_detaches_visits_and_removes_from_active(conn):
    svc.record_heartbeat(conn, SID, T0)
    svc.record_heartbeat(conn, SID2, T0)
    assert svc.count_active_sessions(conn, T0 + timedelta(seconds=10)) == 2
    svc.revoke_session(conn, SID, T0 + timedelta(seconds=20))
    assert svc.count_active_sessions(conn, T0 + timedelta(seconds=30)) == 1
    assert visits(conn, SID) == 0
    assert visits(conn) == 2  # tổng hợp vẫn giữ, chỉ mất mã
    assert conn.execute("SELECT COUNT(*) FROM visit_events WHERE session_id IS NULL").fetchone()[0] == 1


def test_revoke_is_idempotent(conn):
    svc.record_heartbeat(conn, SID, T0)
    assert svc.revoke_session(conn, SID, T0)["revoked"] is True
    assert svc.revoke_session(conn, SID, T0)["revoked"] is True


def test_heartbeat_after_revoke_does_not_reactivate(conn):
    svc.record_heartbeat(conn, SID, T0)
    svc.revoke_session(conn, SID, T0 + timedelta(seconds=5))
    r = svc.record_heartbeat(conn, SID, T0 + timedelta(seconds=35))
    assert r["status"] == "revoked"
    assert svc.count_active_sessions(conn, T0 + timedelta(seconds=40)) == 0
    assert visits(conn) == 1


def test_revoke_before_first_heartbeat_blocks_late_heartbeat(conn):
    svc.revoke_session(conn, SID, T0)
    assert svc.record_heartbeat(conn, SID, T0 + timedelta(seconds=1))["status"] == "revoked"
    assert visits(conn) == 0


# ---- Phiên đang hoạt động (BR17) – nền cho UC11 ----

def test_active_window_is_90_seconds_exclusive(conn):
    svc.record_heartbeat(conn, SID, T0)
    assert svc.count_active_sessions(conn, T0 + timedelta(seconds=89)) == 1
    assert svc.count_active_sessions(conn, T0 + timedelta(seconds=90)) == 0  # last_seen > now-90s


# ---- Dọn dữ liệu 30 ngày (BR16) ----

def test_retention_cutoff_is_start_of_day_minus_29_days_vn():
    now = datetime(2026, 11, 3, 3, 0, tzinfo=timezone.utc)  # 03/11 10:00 VN
    # 03/11 - 29 ngày = 05/10, 00:00 VN = 04/10 17:00 UTC
    assert svc.retention_cutoff(now) == datetime(2026, 10, 4, 17, 0, tzinfo=timezone.utc)


def test_cleanup_boundary_both_sides(conn):
    now = datetime(2026, 11, 3, 3, 0, tzinfo=timezone.utc)
    cutoff = svc.retention_cutoff(now)
    rows = {
        "before": cutoff - timedelta(seconds=1),
        "at": cutoff,
        "after": cutoff + timedelta(seconds=1),
    }
    for name, ts in rows.items():
        conn.execute("INSERT INTO visit_events (id, session_id, started_at) VALUES (?, NULL, ?)", (name, svc.to_iso(ts)))
    result = svc.cleanup_expired(conn, now)
    left = {r[0] for r in conn.execute("SELECT id FROM visit_events")}
    assert left == {"at", "after"}
    assert result["visit_events_deleted"] == 1


def test_cleanup_ignores_vn_day_vs_utc_day(conn):
    """16:59 UTC ngày 04/10 vẫn là ngày 04/10 VN (đã hết hạn); 17:00 UTC là 05/10 VN (còn hạn)."""
    now = datetime(2026, 11, 3, 3, 0, tzinfo=timezone.utc)
    for name, ts in {"old": datetime(2026, 10, 4, 16, 59, 59, tzinfo=timezone.utc),
                     "new": datetime(2026, 10, 4, 17, 0, 0, tzinfo=timezone.utc)}.items():
        conn.execute("INSERT INTO visit_events (id, session_id, started_at) VALUES (?, NULL, ?)", (name, svc.to_iso(ts)))
    svc.cleanup_expired(conn, now)
    assert {r[0] for r in conn.execute("SELECT id FROM visit_events")} == {"new"}


def test_cleanup_removes_stale_sessions_and_tombstones(conn):
    old = T0 - timedelta(days=40)
    svc.record_heartbeat(conn, SID, old)
    svc.revoke_session(conn, SID2, old)
    svc.record_heartbeat(conn, "b1b2c3d4-0000-4000-8000-000000000003", T0)
    result = svc.cleanup_expired(conn, T0)
    assert result["sessions_deleted"] == 2
    assert conn.execute("SELECT COUNT(*) FROM anonymous_sessions").fetchone()[0] == 1


# ---- Route ----

@pytest.fixture
def client(db_path):
    app = FastAPI()
    app.include_router(analytics_routes.router)

    def override():
        c = open_db(db_path)
        try:
            yield c
        finally:
            c.close()

    app.dependency_overrides[analytics_routes.get_connection] = override
    with TestClient(app) as test_client:
        yield test_client


def test_route_heartbeat_then_revoke_then_409(client):
    assert client.post("/api/analytics/heartbeat", json={"session_id": SID}).status_code == 204
    assert client.post("/api/analytics/revoke", json={"session_id": SID}).status_code == 204
    r = client.post("/api/analytics/heartbeat", json={"session_id": SID})
    assert r.status_code == 409 and r.json()["detail"] == "session_revoked"
    assert client.post("/api/analytics/revoke", json={"session_id": SID}).status_code == 204


@pytest.mark.parametrize("bad", ["", "abc", "123", SID + "x"])
def test_route_rejects_bad_session_id(client, bad):
    assert client.post("/api/analytics/heartbeat", json={"session_id": bad}).status_code == 422
    assert client.post("/api/analytics/revoke", json={"session_id": bad}).status_code == 422
