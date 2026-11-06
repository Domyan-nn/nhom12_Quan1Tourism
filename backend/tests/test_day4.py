"""Ngày 4: UC09 công bố/ẩn, UC10/UC11 thống kê Admin, nối router analytics vào app."""
import unittest
import uuid
from contextlib import closing
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

import test_admin_api
from app.api.routes import analytics as analytics_routes
from app.db.connection import connect
from app.main import app
from app.services import analytics_service as svc
from scripts.seed_db import stable_id

BASE = "/api/v1/admin/pois"


class Day4Tests(unittest.TestCase):
    setUp = test_admin_api.AdminAPITests.setUp
    login = test_admin_api.AdminAPITests.login
    headers = test_admin_api.AdminAPITests.headers

    def new_place(self, h):
        body = {"category_id": stable_id("category:history"), "name": "Nơi thử", "address": "1 Test",
                "latitude": 10.77, "longitude": 106.69, "radius_m": 100, "image_url": None}
        r = self.client.post(BASE, json=body, headers=h)
        self.assertEqual(r.status_code, 201, r.text)
        return r.json()["id"]

    def conn(self):
        return closing(connect(self.database))

    # --- UC09 ---
    def test_publish_requires_auth(self):
        self.assertEqual(self.client.post(BASE + "/x/publish").status_code, 401)
        self.assertEqual(self.client.post(BASE + "/x/hide").status_code, 401)

    def test_publish_needs_narration_then_hide(self):
        h = self.headers(self.login())
        pid = self.new_place(h)
        r = self.client.post(f"{BASE}/{pid}/publish", headers=h)
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["error"]["code"], "POI_NOT_PUBLISHABLE")
        self.assertIn("narration", r.json()["error"]["details"])
        self.assertEqual(self.client.get(f"/api/v1/pois/{pid}").status_code, 404)

        n = self.client.post(f"{BASE}/{pid}/narrations", headers=h, json={"locale": "vi", "title": "Tiêu đề", "body": "Nội dung"})
        self.assertEqual(n.status_code, 201, n.text)
        ok = self.client.post(f"{BASE}/{pid}/publish", headers=h)
        self.assertEqual(ok.status_code, 200, ok.text)
        self.assertEqual(ok.json()["status"], "published")
        self.assertEqual(self.client.get(f"/api/v1/pois/{pid}").status_code, 200)
        self.assertEqual(self.client.post(f"{BASE}/{pid}/publish", headers=h).status_code, 409)

        hid = self.client.post(f"{BASE}/{pid}/hide", headers=h)
        self.assertEqual(hid.json()["status"], "hidden")
        self.assertEqual(self.client.get(f"/api/v1/pois/{pid}").status_code, 404)
        self.assertEqual(self.client.post(f"{BASE}/{pid}/hide", headers=h).status_code, 409)
        # Ẩn -> Công khai: kiểm tra lại rồi công bố
        self.assertEqual(self.client.post(f"{BASE}/{pid}/publish", headers=h).json()["status"], "published")

    def test_publish_unknown_place(self):
        h = self.headers(self.login())
        self.assertEqual(self.client.post(f"{BASE}/nope/publish", headers=h).status_code, 404)

    def test_publish_rejects_legacy_invalid_narration_and_fractional_radius(self):
        h = self.headers(self.login())
        pid = self.new_place(h)
        with self.conn() as db, db:
            # SQLite trim accepts Unicode whitespace and old locale spellings.
            db.execute("INSERT INTO poi_narrations VALUES (?,?,?,?,?,?,?)",
                       (str(uuid.uuid4()), pid, "not_a_locale", "\u00a0\t", "Body", "2026-11-01", "2026-11-01"))
        response = self.client.post(f"{BASE}/{pid}/publish", headers=h)
        self.assertEqual(response.status_code, 422)
        self.assertIn("narration", response.json()["error"]["details"])
        self.assertEqual(self.client.get(f"/api/v1/pois/{pid}").status_code, 404)
        self.client.post(f"{BASE}/{pid}/narrations", headers=h,
                         json={"locale": "fr", "title": "Title", "body": "Body"})
        with self.conn() as db, db:
            db.execute("UPDATE pois SET radius_m=20.5 WHERE id=?", (pid,))
        response = self.client.post(f"{BASE}/{pid}/publish", headers=h)
        self.assertEqual(response.status_code, 422)
        self.assertIn("coordinates", response.json()["error"]["details"])
        with self.conn() as db, db:
            db.execute("UPDATE pois SET radius_m=20 WHERE id=?", (pid,))
        self.assertEqual(self.client.post(f"{BASE}/{pid}/publish", headers=h).status_code, 200)

    def test_concurrent_publication_allows_one_transition(self):
        h = self.headers(self.login())
        pid = self.new_place(h)
        self.client.post(f"{BASE}/{pid}/narrations", headers=h,
                         json={"locale": "vi", "title": "Title", "body": "Body"})
        barrier = Barrier(4)
        def publish(_):
            barrier.wait(timeout=10)
            return self.client.post(f"{BASE}/{pid}/publish", headers=h).status_code
        with ThreadPoolExecutor(max_workers=4) as pool:
            statuses = list(pool.map(publish, range(4)))
        self.assertEqual(sorted(statuses), [200, 409, 409, 409])

    # --- UC10 / UC11 ---
    def seed_sessions(self):
        now = datetime.now(timezone.utc)
        with self.conn() as db:
            for i, age in enumerate([10, 60, 200]):  # giây
                sid = str(uuid.uuid4())
                seen = svc.to_iso(now - timedelta(seconds=age))
                db.execute("INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at) VALUES (?,?,?,?)", (sid, 1, seen, seen))
                db.execute("INSERT INTO visit_events (id, session_id, started_at) VALUES (?,?,?)", (str(uuid.uuid4()), sid, seen))
            db.commit()

    def test_stats_require_admin(self):
        self.assertEqual(self.client.get("/api/v1/admin/stats/visits").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/stats/active").status_code, 401)

    def test_active_sessions_90s(self):
        h = self.headers(self.login())
        self.assertEqual(self.client.get("/api/v1/admin/stats/active", headers=h).json()["active_sessions"], 0)
        self.seed_sessions()
        data = self.client.get("/api/v1/admin/stats/active", headers=h).json()
        self.assertEqual(data["active_sessions"], 2)
        self.assertEqual(data["window_seconds"], 90)

    def test_visit_stats_and_range_validation(self):
        h = self.headers(self.login())
        empty = self.client.get("/api/v1/admin/stats/visits", headers=h).json()
        self.assertEqual((empty["today"], empty["last_7_days"], empty["range"]), (0, 0, None))
        self.seed_sessions()
        today = svc.vn_today().isoformat()
        d = self.client.get("/api/v1/admin/stats/visits", params={"date_from": today, "date_to": today}, headers=h).json()
        self.assertEqual(d["range"]["total"], d["today"])
        self.assertGreaterEqual(d["last_7_days"], d["today"])
        self.assertEqual(len(d["range"]["days"]), 1)
        old = (svc.vn_today() - timedelta(days=30)).isoformat()
        for params in [{"date_from": old, "date_to": today}, {"date_from": today, "date_to": old},
                       {"date_from": "abc", "date_to": today}, {"date_from": today}]:
            with self.subTest(params=params):
                r = self.client.get("/api/v1/admin/stats/visits", params=params, headers=h)
                self.assertEqual(r.status_code, 422)
                self.assertEqual(r.json()["error"]["code"], "INVALID_DATE_RANGE")
        edge = (svc.vn_today() - timedelta(days=29)).isoformat()
        r = self.client.get("/api/v1/admin/stats/visits", params={"date_from": edge, "date_to": today}, headers=h)
        self.assertEqual(len(r.json()["range"]["days"]), 30)

    def test_day_boundary_vietnam_time(self):
        # 16:59:59Z hôm trước = 23:59:59 VN (ngày trước); 17:00:00Z = 00:00 VN (ngày sau)
        with self.conn() as db:
            sid = str(uuid.uuid4())
            db.execute("INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at) VALUES (?,1,?,?)",
                       (sid, "2026-11-01T00:00:00.000Z", "2026-11-01T00:00:00.000Z"))
            for t in ("2026-11-03T16:59:59.000Z", "2026-11-03T17:00:00.000Z"):
                db.execute("INSERT INTO visit_events (id, session_id, started_at) VALUES (?,?,?)", (str(uuid.uuid4()), sid, t))
            db.commit()
            from datetime import date
            days = svc.visits_per_day(db, date(2026, 11, 3), date(2026, 11, 4))
        self.assertEqual([d["visits"] for d in days], [1, 1])

    def test_stats_routes_share_vietnam_clock_and_exact_active_boundary(self):
        h = self.headers(self.login())
        now = datetime(2026, 11, 5, 17, tzinfo=timezone.utc)  # VN 06/11 00:00
        with self.conn() as db, db:
            for age, consent in [(0, 1), (89.999, 1), (90, 1), (-1, 1), (1, 0)]:
                stamp = svc.to_iso(now - timedelta(seconds=age))
                db.execute("INSERT INTO anonymous_sessions VALUES (?,?,?,?)", (str(uuid.uuid4()), consent, stamp, stamp))
            for stamp in ("2026-11-05T16:59:59.999Z", "2026-11-05T17:00:00.000Z"):
                db.execute("INSERT INTO visit_events VALUES (?,NULL,?)", (str(uuid.uuid4()), stamp))
        with patch.object(svc, "utcnow", return_value=now):
            data = self.client.get("/api/v1/admin/stats/active", headers=h).json()
            self.assertEqual(data["active_sessions"], 2)
            response = self.client.get("/api/v1/admin/stats/visits", headers=h,
                                       params={"date_from": "2026-10-08", "date_to": "2026-11-06"})
            self.assertEqual(response.status_code, 200)
            visits = response.json()
            self.assertEqual(visits["today"], 1)
            self.assertEqual(visits["last_7_days"], 2)
            self.assertEqual(visits["range"]["total"], 2)
            self.assertEqual(len(visits["range"]["days"]), 30)
            self.assertEqual(self.client.get("/api/v1/admin/stats/visits", headers=h,
                             params={"date_from": "2026-10-07", "date_to": "2026-11-06"}).status_code, 422)

    # --- Dọn dữ liệu quá 30 ngày ---
    def test_run_cleanup_once_boundary(self):
        from app.main import run_cleanup_once
        cutoff = svc.retention_cutoff()
        before, keep = svc.to_iso(cutoff - timedelta(milliseconds=1)), svc.to_iso(cutoff)
        with self.conn() as db:
            sid = str(uuid.uuid4())
            db.execute("INSERT INTO anonymous_sessions (session_id, consent_granted, created_at, last_seen_at) VALUES (?,1,?,?)", (sid, keep, keep))
            for t in (before, keep):
                db.execute("INSERT INTO visit_events (id, session_id, started_at) VALUES (?,?,?)", (str(uuid.uuid4()), sid, t))
            db.commit()
        result = run_cleanup_once(self.database)
        self.assertEqual(result["visit_events_deleted"], 1)
        with self.conn() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM visit_events").fetchone()[0], 1)

    def test_analytics_uses_configured_database_without_override(self):
        import os
        os.environ["SAIGON_DATABASE"] = str(self.database)
        self.addCleanup(os.environ.pop, "SAIGON_DATABASE", None)
        app.dependency_overrides.pop(analytics_routes.get_connection, None)
        sid = str(uuid.uuid4())
        self.assertEqual(self.client.post("/api/analytics/heartbeat", json={"session_id": sid}).status_code, 204)
        with self.conn() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM visit_events").fetchone()[0], 1)

    # --- Nối router analytics vào app ---
    def test_analytics_routes_mounted(self):
        sid = str(uuid.uuid4())
        app.dependency_overrides[analytics_routes.get_connection] = lambda: connect(self.database)
        for prefix in ("/api/analytics", "/api/v1/analytics"):
            with self.subTest(prefix=prefix):
                self.assertEqual(self.client.post(prefix + "/heartbeat", json={"session_id": sid}).status_code, 204)
        self.assertEqual(self.client.post("/api/v1/analytics/revoke", json={"session_id": sid}).status_code, 204)
        self.assertEqual(self.client.post("/api/analytics/heartbeat", json={"session_id": sid}).status_code, 409)
        self.assertEqual(self.client.post("/api/analytics/heartbeat", json={"session_id": "bad"}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
