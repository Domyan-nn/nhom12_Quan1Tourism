"""Kiểm thử UC12 / WBS-08 (BR13–BR16, BR18) trên schema thật: 001 rồi 002.

Chạy như các test khác của nhóm:
    python -m unittest discover -s backend/tests -v
"""
import re
import sqlite3
import sys
import tempfile
import threading
import unittest
import uuid
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import analytics as analytics_routes
from app.services import analytics_service as svc
from scripts.migrate_db import upgrade_connection

SID = "3f2b1c9e-8a44-4d51-9b0c-6a1f2e7d9c10"
SID2 = "a1b2c3d4-0000-4000-8000-000000000002"
SID3 = "b1b2c3d4-0000-4000-8000-000000000003"
T0 = datetime(2026, 11, 3, 3, 0, 0, tzinfo=timezone.utc)  # 10:00 giờ VN
ISO_24 = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


def open_db(path) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=10, isolation_level=None)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def make_db(path) -> None:
    """Giống scripts/init_db.py: 001_initial.sql rồi upgrade_connection (migration 002)."""
    with closing(sqlite3.connect(path)) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript((BACKEND / "migrations" / "001_initial.sql").read_text(encoding="utf-8"))
        upgrade_connection(conn)


class DbTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db_path = Path(tmp.name) / "t.db"
        make_db(self.db_path)
        self.conn = open_db(self.db_path)
        self.addCleanup(self.conn.close)

    def visits(self, sid=None):
        if sid:
            return self.conn.execute("SELECT COUNT(*) FROM visit_events WHERE session_id=?", (sid,)).fetchone()[0]
        return self.conn.execute("SELECT COUNT(*) FROM visit_events").fetchone()[0]

    def insert_event(self, ts):
        self.conn.execute(
            "INSERT INTO visit_events (id, session_id, started_at) VALUES (?, NULL, ?)",
            (str(uuid.uuid4()), svc.to_iso(ts)),
        )


class TimestampFormatTests(DbTestCase):
    def test_to_iso_is_24_chars_milliseconds_utc(self):
        dt = datetime(2026, 11, 3, 3, 0, 0, 123456, tzinfo=timezone.utc)
        self.assertEqual(svc.to_iso(dt), "2026-11-03T03:00:00.123Z")
        self.assertRegex(svc.to_iso(svc.utcnow()), ISO_24)

    def test_to_iso_converts_offsets_to_utc(self):
        vn = datetime(2026, 11, 3, 10, 0, 0, tzinfo=svc.VN_TZ)
        self.assertEqual(svc.to_iso(vn), "2026-11-03T03:00:00.000Z")

    def test_round_trip(self):
        self.assertEqual(svc.from_iso("2026-11-03T03:00:00.123Z"),
                         datetime(2026, 11, 3, 3, 0, 0, 123000, tzinfo=timezone.utc))

    def test_regression_heartbeat_with_microseconds_passes_check_constraints(self):
        """Lỗi cũ: ghi 6 chữ số thập phân làm CHECK(length = 24) của migration 002 thất bại."""
        now = datetime(2026, 11, 3, 3, 0, 0, 987654, tzinfo=timezone.utc)
        self.assertEqual(svc.record_heartbeat(self.conn, SID, now), {"status": "ok", "new_visit": True})
        created, last_seen = self.conn.execute(
            "SELECT created_at, last_seen_at FROM anonymous_sessions").fetchone()
        started = self.conn.execute("SELECT started_at FROM visit_events").fetchone()[0]
        for value in (created, last_seen, started):
            self.assertRegex(value, ISO_24)
        self.assertEqual(created, "2026-11-03T03:00:00.987Z")

    def test_all_written_timestamps_are_24_chars(self):
        svc.record_heartbeat(self.conn, SID, svc.utcnow())
        svc.revoke_session(self.conn, SID2, svc.utcnow())
        svc.cleanup_expired(self.conn)
        for sql in ("SELECT created_at FROM anonymous_sessions",
                    "SELECT last_seen_at FROM anonymous_sessions",
                    "SELECT started_at FROM visit_events"):
            for (value,) in self.conn.execute(sql):
                self.assertRegex(value, ISO_24)

    def test_session_id_is_stored_lowercase_uuid_v4(self):
        svc.record_heartbeat(self.conn, SID.upper(), T0)
        self.assertEqual(self.conn.execute("SELECT session_id FROM anonymous_sessions").fetchone()[0], SID)


class HeartbeatTests(DbTestCase):
    def test_first_heartbeat_creates_session_and_one_visit(self):
        self.assertEqual(svc.record_heartbeat(self.conn, SID, T0), {"status": "ok", "new_visit": True})
        self.assertEqual(self.visits(SID), 1)

    def test_continuous_heartbeats_do_not_add_visits(self):
        svc.record_heartbeat(self.conn, SID, T0)
        for i in range(1, 10):
            r = svc.record_heartbeat(self.conn, SID, T0 + timedelta(seconds=30 * i))
            self.assertFalse(r["new_visit"])
        self.assertEqual(self.visits(), 1)

    def test_gap_just_under_30_minutes_is_same_visit(self):
        svc.record_heartbeat(self.conn, SID, T0)
        r = svc.record_heartbeat(self.conn, SID, T0 + timedelta(minutes=30) - timedelta(milliseconds=1))
        self.assertFalse(r["new_visit"])
        self.assertEqual(self.visits(), 1)

    def test_gap_of_exactly_30_minutes_starts_new_visit(self):
        svc.record_heartbeat(self.conn, SID, T0)
        r = svc.record_heartbeat(self.conn, SID, T0 + timedelta(minutes=30))
        self.assertTrue(r["new_visit"])
        self.assertEqual(self.visits(), 2)

    def test_microsecond_noise_does_not_shift_30_minute_boundary(self):
        """T0 có phần lẻ micro giây; cả hai mốc đều bị cắt về mili giây nên biên 30 phút không lệch."""
        start = T0.replace(microsecond=500_900)
        svc.record_heartbeat(self.conn, SID, start)
        r = svc.record_heartbeat(self.conn, SID, start + timedelta(minutes=30))
        self.assertTrue(r["new_visit"])

    def test_last_seen_never_moves_backwards(self):
        svc.record_heartbeat(self.conn, SID, T0 + timedelta(seconds=60))
        svc.record_heartbeat(self.conn, SID, T0)  # đồng hồ lệch, không vi phạm CHECK last_seen >= created
        last = self.conn.execute("SELECT last_seen_at FROM anonymous_sessions").fetchone()[0]
        self.assertEqual(last, svc.to_iso(T0 + timedelta(seconds=60)))

    def test_invalid_session_id_rejected(self):
        for bad in ("not-a-uuid", "", None):
            with self.subTest(bad=bad), self.assertRaises(svc.InvalidSessionId):
                svc.record_heartbeat(self.conn, bad, T0)
        self.assertEqual(self.visits(), 0)

    def test_non_v4_uuid_is_rejected_by_database_not_silently_stored(self):
        v1 = str(uuid.uuid1())
        with self.assertRaises(sqlite3.IntegrityError):
            svc.record_heartbeat(self.conn, v1, T0)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM anonymous_sessions").fetchone()[0], 0)

    def test_concurrent_heartbeats_create_single_visit(self):
        errors = []

        def worker():
            c = open_db(self.db_path)
            try:
                svc.record_heartbeat(c, SID, T0)
            except Exception as exc:  # pragma: no cover
                errors.append(exc)
            finally:
                c.close()

        threads = [threading.Thread(target=worker) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])
        self.assertEqual(self.visits(), 1)


class RevokeTests(DbTestCase):
    def test_revoke_detaches_visits_and_removes_from_active(self):
        svc.record_heartbeat(self.conn, SID, T0)
        svc.record_heartbeat(self.conn, SID2, T0)
        self.assertEqual(svc.count_active_sessions(self.conn, T0 + timedelta(seconds=10)), 2)
        svc.revoke_session(self.conn, SID, T0 + timedelta(seconds=20))
        self.assertEqual(svc.count_active_sessions(self.conn, T0 + timedelta(seconds=30)), 1)
        self.assertEqual(self.visits(SID), 0)
        self.assertEqual(self.visits(), 2)  # tổng hợp vẫn giữ, chỉ mất mã
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM visit_events WHERE session_id IS NULL").fetchone()[0], 1)

    def test_revoke_is_idempotent(self):
        svc.record_heartbeat(self.conn, SID, T0)
        self.assertTrue(svc.revoke_session(self.conn, SID, T0)["revoked"])
        self.assertTrue(svc.revoke_session(self.conn, SID, T0)["revoked"])

    def test_revoke_does_not_change_last_seen_even_with_skewed_clock(self):
        svc.record_heartbeat(self.conn, SID, T0 + timedelta(seconds=60))
        before = self.conn.execute("SELECT last_seen_at FROM anonymous_sessions").fetchone()[0]
        svc.revoke_session(self.conn, SID, T0)  # 'now' sớm hơn created_at: không được vi phạm CHECK
        after = self.conn.execute("SELECT last_seen_at, consent_granted FROM anonymous_sessions").fetchone()
        self.assertEqual(after, (before, 0))

    def test_heartbeat_after_revoke_does_not_reactivate(self):
        svc.record_heartbeat(self.conn, SID, T0)
        svc.revoke_session(self.conn, SID, T0 + timedelta(seconds=5))
        r = svc.record_heartbeat(self.conn, SID, T0 + timedelta(seconds=35))
        self.assertEqual(r["status"], "revoked")
        self.assertEqual(svc.count_active_sessions(self.conn, T0 + timedelta(seconds=40)), 0)
        self.assertEqual(self.visits(), 1)

    def test_revoke_before_first_heartbeat_blocks_late_heartbeat(self):
        svc.revoke_session(self.conn, SID, T0)
        self.assertEqual(svc.record_heartbeat(self.conn, SID, T0 + timedelta(seconds=1))["status"], "revoked")
        self.assertEqual(self.visits(), 0)


class ActiveSessionTests(DbTestCase):
    def test_active_window_is_90_seconds_exclusive(self):
        svc.record_heartbeat(self.conn, SID, T0)
        self.assertEqual(svc.count_active_sessions(self.conn, T0 + timedelta(seconds=89)), 1)
        self.assertEqual(svc.count_active_sessions(self.conn, T0 + timedelta(seconds=90)), 0)


class RetentionTests(DbTestCase):
    NOW = datetime(2026, 11, 3, 3, 0, tzinfo=timezone.utc)  # 03/11 10:00 VN

    def test_cutoff_is_start_of_day_minus_29_days_vn(self):
        # 03/11 - 29 ngày = 05/10; 00:00 VN = 04/10 17:00 UTC
        self.assertEqual(svc.retention_cutoff(self.NOW), datetime(2026, 10, 4, 17, 0, tzinfo=timezone.utc))

    def test_cleanup_boundary_both_sides(self):
        cutoff = svc.retention_cutoff(self.NOW)
        for ts in (cutoff - timedelta(milliseconds=1), cutoff, cutoff + timedelta(milliseconds=1)):
            self.insert_event(ts)
        result = svc.cleanup_expired(self.conn, self.NOW)
        left = sorted(r[0] for r in self.conn.execute("SELECT started_at FROM visit_events"))
        self.assertEqual(left, [svc.to_iso(cutoff), svc.to_iso(cutoff + timedelta(milliseconds=1))])
        self.assertEqual(result["visit_events_deleted"], 1)

    def test_cleanup_uses_vietnam_day_not_utc_day(self):
        """16:59:59.999 UTC ngày 04/10 vẫn là ngày 04/10 VN (hết hạn); 17:00 UTC là 05/10 VN (còn hạn)."""
        self.insert_event(datetime(2026, 10, 4, 16, 59, 59, 999000, tzinfo=timezone.utc))
        self.insert_event(datetime(2026, 10, 4, 17, 0, 0, tzinfo=timezone.utc))
        svc.cleanup_expired(self.conn, self.NOW)
        left = [r[0] for r in self.conn.execute("SELECT started_at FROM visit_events")]
        self.assertEqual(left, ["2026-10-04T17:00:00.000Z"])

    def test_cleanup_removes_stale_sessions_and_tombstones(self):
        old = self.NOW - timedelta(days=40)
        svc.record_heartbeat(self.conn, SID, old)
        svc.revoke_session(self.conn, SID2, old)
        svc.record_heartbeat(self.conn, SID3, self.NOW)
        result = svc.cleanup_expired(self.conn, self.NOW)
        self.assertEqual(result["sessions_deleted"], 2)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM anonymous_sessions").fetchone()[0], 1)


class RouteTests(DbTestCase):
    def setUp(self):
        super().setUp()
        app = FastAPI()
        app.include_router(analytics_routes.router)

        def override():
            c = open_db(self.db_path)
            try:
                yield c
            finally:
                c.close()

        app.dependency_overrides[analytics_routes.get_connection] = override
        self.client = TestClient(app)

    def test_heartbeat_then_revoke_then_409(self):
        post = self.client.post
        self.assertEqual(post("/api/analytics/heartbeat", json={"session_id": SID}).status_code, 204)
        self.assertEqual(post("/api/analytics/revoke", json={"session_id": SID}).status_code, 204)
        r = post("/api/analytics/heartbeat", json={"session_id": SID})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(post("/api/analytics/revoke", json={"session_id": SID}).status_code, 204)

    def test_rejects_bad_session_id(self):
        for bad in ("", "abc", "123", SID + "x"):
            for path in ("heartbeat", "revoke"):
                with self.subTest(bad=bad, path=path):
                    r = self.client.post(f"/api/analytics/{path}", json={"session_id": bad})
                    self.assertEqual(r.status_code, 422)


if __name__ == "__main__":
    unittest.main()
