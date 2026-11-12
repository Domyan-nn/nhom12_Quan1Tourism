"""Extension C: Admin audit log (migration 005, one entry per successful admin action, GET /api/v1/admin/audit-log)."""
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import test_admin_api
from app.db.connection import connect
from app.main import app
from app.services import audit
from scripts.seed_db import password_hash, stable_id

BASE = "/api/v1/admin"
LOG = BASE + "/audit-log"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
SECRET_TITLE = "SECRET-TITLE-9f3a"
SECRET_BODY = "SECRET-BODY-TEXT-71bc"


class AuditTestCase(unittest.TestCase):
    setUp_admin = test_admin_api.AdminAPITests.setUp
    login = test_admin_api.AdminAPITests.login
    headers = test_admin_api.AdminAPITests.headers

    def setUp(self):
        self.setUp_admin()
        uploads = tempfile.TemporaryDirectory()
        self.addCleanup(uploads.cleanup)
        self.enterContext(patch.dict(os.environ, {"SAIGON_UPLOADS": uploads.name}))

    # --- helpers -------------------------------------------------------------------------------
    def mark(self):
        with closing(connect(self.database)) as db:
            return db.execute("SELECT coalesce(max(rowid), 0) FROM admin_audit_log").fetchone()[0]

    def since(self, mark):
        with closing(connect(self.database)) as db:
            return [dict(r) for r in db.execute("SELECT * FROM admin_audit_log WHERE rowid > ? ORDER BY rowid", (mark,))]

    def admin_id(self, headers):
        return self.client.get(BASE + "/me", headers=headers).json()["id"]

    def place_body(self, category_id, **changes):
        return {"category_id": category_id, "name": "Place", "address": "Address", "latitude": 10.7,
                "longitude": 106.7, "radius_m": 100, **changes}

    def make_category(self, headers, name="Cat", name_en="Cat en"):
        response = self.client.post(BASE + "/categories", headers=headers, json={"name": name, "name_en": name_en})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def make_place(self, headers, category_id, **changes):
        response = self.client.post(BASE + "/pois", headers=headers, json=self.place_body(category_id, **changes))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def make_narration(self, headers, poi_id, locale="vi", title="Title", body="Body"):
        response = self.client.post(f"{BASE}/pois/{poi_id}/narrations", headers=headers,
                                    json={"locale": locale, "title": title, "body": body})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def second_admin(self, username="second-admin", password="second-admin-test-only"):
        with closing(connect(self.database)) as db, db:
            db.execute("INSERT INTO admin_accounts (id, username, password_hash, created_at, updated_at) VALUES (?,?,?,?,?)",
                       ("admin-2", username, password_hash(password), "2026-11-12T00:00:00+00:00", "2026-11-12T00:00:00+00:00"))
        response = self.client.post(BASE + "/login", json={"username": username, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return self.headers(response.json()["access_token"])


class EveryActionIsLoggedOnceTests(AuditTestCase):
    def check(self, mark, action, admin_id, target_type, target_id, summary):
        rows = self.since(mark)
        self.assertEqual(len(rows), 1, f"{action}: expected exactly one new entry, got {rows}")
        row = rows[0]
        self.assertEqual((row["action"], row["admin_id"], row["target_type"], row["target_id"], row["summary"]),
                         (action, admin_id, target_type, target_id, summary))
        self.assertRegex(row["created_at"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$")
        return row

    def test_all_fifteen_actions_write_one_row_for_the_right_admin(self):
        mark = self.mark()
        token = self.login()
        headers = self.headers(token)
        me = self.admin_id(headers)
        self.check(mark, "auth.login", me, "admin", me, None)

        mark = self.mark()
        category = self.make_category(headers, "Lịch sử", "History")
        self.check(mark, "category.create", me, "category", category, "Lịch sử")

        mark = self.mark()
        r = self.client.patch(f"{BASE}/categories/{category}", headers=headers, json={"name": "Lịch sử mới", "name_en": "History"})
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "category.update", me, "category", category, "Lịch sử mới")

        mark = self.mark()
        poi = self.make_place(headers, category, name="Dinh Độc Lập")
        self.check(mark, "poi.create", me, "poi", poi, "Dinh Độc Lập")

        mark = self.mark()
        r = self.client.put(f"{BASE}/pois/{poi}", headers=headers, json=self.place_body(category, name="Dinh Thống Nhất"))
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "poi.update", me, "poi", poi, "Dinh Thống Nhất")

        mark = self.mark()
        narration = self.make_narration(headers, poi, "vi", SECRET_TITLE, SECRET_BODY)
        self.check(mark, "narration.create", me, "narration", narration, "Dinh Thống Nhất / vi")

        mark = self.mark()
        r = self.client.put(f"{BASE}/pois/{poi}/narrations/{narration}", headers=headers, json={"title": "T2", "body": "B2"})
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "narration.update", me, "narration", narration, "Dinh Thống Nhất / vi")

        mark = self.mark()
        r = self.client.post(f"{BASE}/pois/{poi}/publish", headers=headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "poi.publish", me, "poi", poi, "Dinh Thống Nhất")

        mark = self.mark()
        r = self.client.post(f"{BASE}/pois/{poi}/hide", headers=headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "poi.hide", me, "poi", poi, "Dinh Thống Nhất")

        mark = self.mark()
        r = self.client.put(f"{BASE}/pois/{poi}/image", headers={**headers, "Content-Type": "image/png"}, content=PNG)
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "poi.image_upload", me, "poi", poi, "Dinh Thống Nhất")

        mark = self.mark()
        r = self.client.delete(f"{BASE}/pois/{poi}/image", headers=headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.check(mark, "poi.image_delete", me, "poi", poi, "Dinh Thống Nhất")

        mark = self.mark()
        r = self.client.delete(f"{BASE}/pois/{poi}/narrations/{narration}", headers=headers)
        self.assertEqual(r.status_code, 204, r.text)
        self.check(mark, "narration.delete", me, "narration", narration, "Dinh Thống Nhất / vi")

        extra = self.make_narration(headers, poi, "en")  # cascade must not add one entry per narration
        mark = self.mark()
        r = self.client.delete(f"{BASE}/pois/{poi}", headers=headers)
        self.assertEqual(r.status_code, 204, r.text)
        self.check(mark, "poi.delete", me, "poi", poi, "Dinh Thống Nhất")
        with closing(connect(self.database)) as db:
            self.assertIsNone(db.execute("SELECT 1 FROM poi_narrations WHERE id=?", (extra,)).fetchone())

        mark = self.mark()
        r = self.client.delete(f"{BASE}/categories/{category}", headers=headers)
        self.assertEqual(r.status_code, 204, r.text)
        self.check(mark, "category.delete", me, "category", category, "Lịch sử mới")

        mark = self.mark()
        self.assertEqual(self.client.post(BASE + "/logout", headers=headers).status_code, 204)
        self.check(mark, "auth.logout", me, "admin", me, None)

        # Entries outlive the things they describe: the deleted place and category are still named in the log.
        headers = self.headers(self.login())
        items = self.client.get(LOG + "?limit=200", headers=headers).json()["items"]
        actions = [i["action"] for i in reversed(items)]
        self.assertEqual(actions[:16], ["auth.login", "category.create", "category.update", "poi.create", "poi.update",
                                       "narration.create", "narration.update", "poi.publish", "poi.hide",
                                       "poi.image_upload", "poi.image_delete", "narration.delete", "narration.create",
                                       "poi.delete", "category.delete", "auth.logout"])

    def test_two_admins_are_told_apart(self):
        first = self.headers(self.login())
        second = self.second_admin()
        category = self.make_category(first, "A", "A")
        poi = self.make_place(second, category, name="By second")
        items = self.client.get(LOG, headers=first).json()["items"]
        by_target = {(i["action"], i["target_id"]): i["admin_username"] for i in items}
        self.assertEqual(by_target[("category.create", category)], "demoadmin")
        self.assertEqual(by_target[("poi.create", poi)], "second-admin")


class RejectedActionsAreNotLoggedTests(AuditTestCase):
    def test_no_entry_when_the_request_is_rejected(self):
        headers = self.headers(self.login())
        category = self.make_category(headers, "Used", "Used")
        poi = self.make_place(headers, category, name="Draft place")
        narration = self.make_narration(headers, poi, "vi")
        other = self.make_category(headers, "Unused", "Unused")
        self.assertEqual(self.client.post(f"{BASE}/pois/{poi}/publish", headers=headers).status_code, 200)
        draft = self.make_place(headers, other, name="Another draft")  # no narration: cannot be published, cannot be hidden
        bad = self.headers("invalid-token")
        too_big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024)
        attempts = [
            ("wrong password", lambda: self.client.post(BASE + "/login", json={"username": "demoadmin", "password": "wrong"}), 401),
            ("unknown user", lambda: self.client.post(BASE + "/login", json={"username": "nobody", "password": "x"}), 401),
            ("category without session", lambda: self.client.post(BASE + "/categories", json={"name": "N", "name_en": "N"}), 401),
            ("category with bad token", lambda: self.client.post(BASE + "/categories", headers=bad, json={"name": "N", "name_en": "N"}), 401),
            ("poi without session", lambda: self.client.delete(f"{BASE}/pois/{poi}"), 401),
            ("duplicate category", lambda: self.client.post(BASE + "/categories", headers=headers, json={"name": "used", "name_en": "Other"}), 409),
            ("blank category", lambda: self.client.post(BASE + "/categories", headers=headers, json={"name": " ", "name_en": "x"}), 422),
            ("update missing category", lambda: self.client.patch(BASE + "/categories/missing", headers=headers, json={"name": "N", "name_en": "N"}), 404),
            ("delete missing category", lambda: self.client.delete(BASE + "/categories/missing", headers=headers), 404),
            ("delete category in use", lambda: self.client.delete(f"{BASE}/categories/{category}", headers=headers), 409),
            ("poi bad latitude", lambda: self.client.post(BASE + "/pois", headers=headers, json=self.place_body(category, latitude=91)), 422),
            ("poi missing category", lambda: self.client.post(BASE + "/pois", headers=headers, json=self.place_body("missing")), 422),
            ("update missing poi", lambda: self.client.put(BASE + "/pois/missing", headers=headers, json=self.place_body(category)), 404),
            ("delete missing poi", lambda: self.client.delete(BASE + "/pois/missing", headers=headers), 404),
            ("duplicate narration", lambda: self.client.post(f"{BASE}/pois/{poi}/narrations", headers=headers, json={"locale": "VI", "title": "T", "body": "B"}), 409),
            ("blank narration", lambda: self.client.post(f"{BASE}/pois/{poi}/narrations", headers=headers, json={"locale": "en", "title": " ", "body": "B"}), 422),
            ("update missing narration", lambda: self.client.put(f"{BASE}/pois/{poi}/narrations/missing", headers=headers, json={"title": "T", "body": "B"}), 404),
            ("delete missing narration", lambda: self.client.delete(f"{BASE}/pois/{poi}/narrations/missing", headers=headers), 404),
            ("delete last narration of a published place", lambda: self.client.delete(f"{BASE}/pois/{poi}/narrations/{narration}", headers=headers), 409),
            ("publish twice", lambda: self.client.post(f"{BASE}/pois/{poi}/publish", headers=headers), 409),
            ("hide a draft", lambda: self.client.post(f"{BASE}/pois/{draft}/hide", headers=headers), 409),
            ("publish without narration", lambda: self.client.post(f"{BASE}/pois/{draft}/publish", headers=headers), 422),
            ("upload wrong type", lambda: self.client.put(f"{BASE}/pois/{poi}/image", headers={**headers, "Content-Type": "text/plain"}, content=b"x"), 415),
            ("upload type/signature mismatch", lambda: self.client.put(f"{BASE}/pois/{poi}/image", headers={**headers, "Content-Type": "image/jpeg"}, content=PNG), 422),
            ("upload too large", lambda: self.client.put(f"{BASE}/pois/{poi}/image", headers={**headers, "Content-Type": "image/png"}, content=too_big), 413),
            ("upload to missing poi", lambda: self.client.put(BASE + "/pois/missing/image", headers={**headers, "Content-Type": "image/png"}, content=PNG), 404),
        ]
        for name, call, expected in attempts:
            with self.subTest(name):
                mark = self.mark()
                response = call()
                self.assertEqual(response.status_code, expected, response.text)
                self.assertEqual(self.since(mark), [], f"{name} must not be logged")

    def test_reads_are_not_logged(self):
        headers = self.headers(self.login())
        mark = self.mark()
        for path in ("/categories", "/pois", "/me", "/audit-log", "/stats/visits"):
            self.client.get(BASE + path, headers=headers)
        self.assertEqual(self.since(mark), [])

    def test_second_logout_with_a_dead_token_is_not_logged(self):
        headers = self.headers(self.login())
        self.assertEqual(self.client.post(BASE + "/logout", headers=headers).status_code, 204)
        mark = self.mark()
        self.assertEqual(self.client.post(BASE + "/logout", headers=headers).status_code, 401)
        self.assertEqual(self.since(mark), [])


class AtomicityTests(AuditTestCase):
    """The entry and the change are one transaction: if logging fails, the change is rolled back."""

    def broken(self):
        client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(client.close)
        return client, patch("app.services.audit.record", side_effect=sqlite3.OperationalError("disk full"))

    def test_failed_logging_rolls_back_category_place_status_and_login(self):
        headers = self.headers(self.login())
        category = self.make_category(headers, "Keep", "Keep")
        poi = self.make_place(headers, category, name="Keep place")
        self.make_narration(headers, poi)
        client, failing = self.broken()
        with closing(connect(self.database)) as db:
            sessions = db.execute("SELECT count(*) FROM admin_sessions").fetchone()[0]
        with failing:
            self.assertEqual(client.post(BASE + "/categories", headers=headers, json={"name": "Lost", "name_en": "Lost"}).status_code, 500)
            self.assertEqual(client.post(BASE + "/pois", headers=headers, json=self.place_body(category, name="Lost place")).status_code, 500)
            self.assertEqual(client.post(f"{BASE}/pois/{poi}/publish", headers=headers).status_code, 500)
            self.assertEqual(client.delete(f"{BASE}/pois/{poi}", headers=headers).status_code, 500)
            self.assertEqual(client.post(BASE + "/login", json={"username": "demoadmin", "password": self.password}).status_code, 500)
        with closing(connect(self.database)) as db:
            self.assertIsNone(db.execute("SELECT 1 FROM categories WHERE name='Lost'").fetchone())
            self.assertIsNone(db.execute("SELECT 1 FROM pois WHERE name='Lost place'").fetchone())
            self.assertEqual(db.execute("SELECT status FROM pois WHERE id=?", (poi,)).fetchone()[0], "draft")
            self.assertIsNotNone(db.execute("SELECT 1 FROM pois WHERE id=?", (poi,)).fetchone())
            self.assertEqual(db.execute("SELECT count(*) FROM admin_sessions").fetchone()[0], sessions)

    def test_record_never_commits_by_itself(self):
        with closing(connect(self.database)) as db:
            admin = db.execute("SELECT id FROM admin_accounts").fetchone()[0]
            db.execute("BEGIN")
            audit.record(db, admin, "auth.login", "admin", admin)
            db.rollback()
            self.assertEqual(db.execute("SELECT count(*) FROM admin_audit_log").fetchone()[0], 0)


class PrivacyAndSummaryTests(AuditTestCase):
    def test_no_password_token_or_narration_text_is_stored(self):
        token = self.login()
        headers = self.headers(token)
        category = self.make_category(headers)
        poi = self.make_place(headers, category)
        self.make_narration(headers, poi, "vi", SECRET_TITLE, SECRET_BODY)
        self.client.put(f"{BASE}/pois/{poi}/narrations/" + self.client.get(f"{BASE}/pois/{poi}/narrations", headers=headers).json()["items"][0]["id"],
                        headers=headers, json={"title": SECRET_TITLE + "x", "body": SECRET_BODY + "x"})
        with closing(connect(self.database)) as db:
            dump = " ".join(str(v) for row in db.execute("SELECT * FROM admin_audit_log") for v in tuple(row))
        for secret in (self.password, token, SECRET_TITLE, SECRET_BODY):
            self.assertNotIn(secret, dump)
        self.assertNotIn(SECRET_BODY, self.client.get(LOG, headers=headers).text)

    def test_clean_summary(self):
        self.assertEqual(audit.clean_summary("  a\n\tb\x00c  "), "a b c")
        self.assertIsNone(audit.clean_summary("   \n "))
        self.assertIsNone(audit.clean_summary(None))
        long = audit.clean_summary("x" * 500)
        self.assertEqual(len(long), audit.SUMMARY_MAX)
        self.assertTrue(long.endswith("…"))

    def test_multiline_place_name_is_stored_on_one_line(self):
        headers = self.headers(self.login())
        category = self.make_category(headers)
        mark = self.mark()
        self.make_place(headers, category, name="Line one\nLine two")
        self.assertEqual(self.since(mark)[0]["summary"], "Line one Line two")

    def test_unknown_action_is_rejected(self):
        with closing(connect(self.database)) as db:
            admin = db.execute("SELECT id FROM admin_accounts").fetchone()[0]
            with self.assertRaises(ValueError):
                audit.record(db, admin, "poi.explode")


class AuditLogApiTests(AuditTestCase):
    def test_requires_a_valid_admin_session(self):
        self.assertEqual(self.client.get(LOG).status_code, 401)
        self.assertEqual(self.client.get(LOG, headers=self.headers("invalid")).status_code, 401)
        token = self.login()
        self.client.post(BASE + "/logout", headers=self.headers(token))
        self.assertEqual(self.client.get(LOG, headers=self.headers(token)).status_code, 401)
        for method in ("post", "put", "patch", "delete"):
            self.assertIn(getattr(self.client, method)(LOG, headers=self.headers(self.login())).status_code, (404, 405))

    def test_newest_first_with_stable_order_inside_the_same_second(self):
        headers = self.headers(self.login())
        for name in ("A", "B", "C"):
            self.make_category(headers, name, name)
        items = self.client.get(LOG, headers=headers).json()["items"]
        self.assertEqual([i["summary"] for i in items[:3]], ["C", "B", "A"])
        self.assertEqual(items[3]["action"], "auth.login")
        self.assertEqual(set(items[0]), {"id", "admin_id", "admin_username", "action", "target_type", "target_id", "summary", "created_at"})

    def test_limit_default_bounds_and_validation(self):
        headers = self.headers(self.login())
        with closing(connect(self.database)) as db, db:
            admin = db.execute("SELECT id FROM admin_accounts").fetchone()[0]
            for index in range(60):
                audit.record(db, admin, "category.create", "category", f"c{index}", f"Cat {index}")
        body = self.client.get(LOG, headers=headers).json()
        self.assertEqual((len(body["items"]), body["limit"]), (50, 50))
        self.assertEqual(body["items"][0]["summary"], "Cat 59")
        self.assertEqual(len(self.client.get(LOG + "?limit=1", headers=headers).json()["items"]), 1)
        self.assertEqual(len(self.client.get(LOG + "?limit=200", headers=headers).json()["items"]), 61)
        for bad in ("0", "-1", "201", "abc", ""):
            with self.subTest(limit=bad):
                response = self.client.get(LOG + "?limit=" + bad, headers=headers)
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")

    def test_empty_log_returns_an_empty_list(self):
        headers = self.headers(self.login())
        with closing(connect(self.database)) as db, db:
            db.execute("DELETE FROM admin_audit_log")
        self.assertEqual(self.client.get(LOG, headers=headers).json(), {"items": [], "limit": 50})


class Migration005Tests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "v4.db"
        self.backup = Path(directory.name) / "backup.db"
        from scripts.migrate_004_poi_image_credit import upgrade_connection as upgrade_image_credit
        from scripts.migrate_db import upgrade_connection as upgrade_analytics
        from scripts.prepare_category_bilingual import upgrade_connection as upgrade_categories
        root = Path(test_admin_api.BACKEND)
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript((root / "migrations/001_initial.sql").read_text(encoding="utf-8"))
            upgrade_analytics(db)
            upgrade_categories(db)
            upgrade_image_credit(db)
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("INSERT INTO admin_accounts (id,username,password_hash,created_at,updated_at) VALUES ('a','a','x','now','now')")

    def version_and_tables(self, path):
        with closing(sqlite3.connect(path)) as db:
            return db.execute("PRAGMA user_version").fetchone()[0], {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}

    def test_check_then_apply_with_backup_keeps_rows(self):
        from scripts.migrate_005_admin_audit_log import migrate
        migrate(self.path, check_only=True)
        self.assertEqual(self.version_and_tables(self.path)[0], 4)
        migrate(self.path, backup=self.backup)
        version, tables = self.version_and_tables(self.path)
        self.assertEqual(version, 5)
        self.assertIn("admin_audit_log", tables)
        backup_version, backup_tables = self.version_and_tables(self.backup)
        self.assertEqual(backup_version, 4)
        self.assertNotIn("admin_audit_log", backup_tables)
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(db.execute("SELECT username FROM admin_accounts").fetchone()[0], "a")

    def test_refuses_repeat_missing_backup_and_wrong_version(self):
        from scripts.migrate_005_admin_audit_log import MigrationError, migrate
        with self.assertRaises(MigrationError):
            migrate(self.path)  # no --backup
        migrate(self.path, backup=self.backup)
        with self.assertRaises(MigrationError):
            migrate(self.path, check_only=True)  # already at 5
        old = self.path.parent / "v2.db"
        with closing(sqlite3.connect(old)) as db:
            db.executescript((Path(test_admin_api.BACKEND) / "migrations/001_initial.sql").read_text(encoding="utf-8"))
        with self.assertRaises(MigrationError):
            migrate(old, check_only=True)

    def test_constraints_and_restrict(self):
        from scripts.migrate_005_admin_audit_log import migrate
        migrate(self.path, backup=self.backup)
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("PRAGMA foreign_keys = ON")
            row = ("e1", "a", "auth.login", "admin", "a", "ok", "2026-11-12T00:00:00+00:00")
            db.execute("INSERT INTO admin_audit_log VALUES (?,?,?,?,?,?,?)", row)
            for index, bad in ((1, "missing-admin"), (2, ""), (5, "")):  # unknown admin, empty action, empty summary
                values = list(("e2", "a", "x", None, None, None, "2026-11-12T00:00:00+00:00"))
                values[index] = bad
                with self.subTest(column=index), self.assertRaises(sqlite3.IntegrityError):
                    db.execute("INSERT INTO admin_audit_log VALUES (?,?,?,?,?,?,?)", values)
            # An account that has an audit trail cannot be deleted (it can still be locked with is_active = 0).
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("DELETE FROM admin_accounts WHERE id='a'")

    def test_api_refuses_a_version_4_database_without_changing_it(self):
        before = self.path.read_bytes()
        with patch.dict(os.environ, {"SAIGON_DATABASE": str(self.path), "SAIGON_DISABLE_CLEANUP": "1"}):
            with self.assertRaisesRegex(RuntimeError, "migrate_005"):
                with TestClient(app):
                    self.fail("A schema 4 database must not start")
        self.assertEqual(self.path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
