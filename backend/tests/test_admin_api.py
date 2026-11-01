import hashlib
import secrets
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.api.dependencies import get_db
from app.db.connection import connect
from app.main import app
from scripts.seed_db import seed, stable_id


class AdminAPITests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / "api-test.db"
        result = subprocess.run([sys.executable, str(BACKEND / "scripts" / "init_db.py"), "--database", str(self.database)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.password = secrets.token_urlsafe(24)
        seed(self.database, "DemoAdmin", self.password)

        def test_db():
            db = connect(self.database)
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = test_db
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def login(self):
        response = self.client.post("/api/v1/admin/login", json={"username": " DemoAdmin ", "password": self.password})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers.get("cache-control"), "no-store")
        return response.json()["access_token"]

    def headers(self, token):
        return {"Authorization": "Bearer " + token}

    def test_health_and_seed_password_login(self):
        self.assertEqual(self.client.get("/api/v1/health").json(), {"status": "ok"})
        token = self.login()
        response = self.client.get("/api/v1/admin/me", headers=self.headers(token))
        self.assertEqual(response.json()["username"], "demoadmin")
        with closing(connect(self.database)) as db:
            session = db.execute("SELECT token_hash, issued_at, expires_at FROM admin_sessions").fetchone()
            self.assertEqual(session["token_hash"], hashlib.sha256(token.encode()).hexdigest())
            self.assertNotEqual(session["token_hash"], token)
            self.assertGreater(datetime.fromisoformat(session["expires_at"]), datetime.fromisoformat(session["issued_at"]))

    def test_wrong_password_unknown_and_locked_are_generic(self):
        wrong_password = secrets.token_urlsafe(24)
        bad = self.client.post("/api/v1/admin/login", json={"username": "demoadmin", "password": wrong_password})
        missing = self.client.post("/api/v1/admin/login", json={"username": "unknown", "password": self.password})
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE admin_accounts SET is_active=0")
        locked = self.client.post("/api/v1/admin/login", json={"username": "demoadmin", "password": self.password})
        self.assertEqual([bad.status_code, missing.status_code, locked.status_code], [401, 401, 401])
        self.assertEqual(bad.json(), missing.json())
        self.assertEqual(bad.json(), locked.json())
        self.assertNotIn(wrong_password, bad.text)
        with closing(connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM admin_sessions").fetchone()[0], 0)

    def test_admin_routes_require_authentication(self):
        requests = [("GET", "/api/v1/admin/me", None), ("POST", "/api/v1/admin/logout", None),
                    ("GET", "/api/v1/admin/categories", None), ("POST", "/api/v1/admin/categories", {"name": "a"}),
                    ("PATCH", "/api/v1/admin/categories/any", {"name": "a"}), ("DELETE", "/api/v1/admin/categories/any", None)]
        for method, path, body in requests:
            for headers in ({}, self.headers(secrets.token_urlsafe(32))):
                with self.subTest(method=method, path=path, headers=bool(headers)):
                    response = self.client.request(method, path, json=body, headers=headers)
                    self.assertEqual(response.status_code, 401)
                    self.assertEqual(response.json()["error"]["code"], "AUTH_REQUIRED")

    def test_expired_revoked_and_locked_session(self):
        token = self.login()
        digest = hashlib.sha256(token.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE admin_sessions SET issued_at=?, expires_at=? WHERE token_hash=?",
                       ((now - timedelta(hours=2)).isoformat(), (now - timedelta(hours=1)).isoformat(), digest))
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=self.headers(token)).status_code, 401)
        token = self.login()
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE admin_sessions SET revoked_at=? WHERE token_hash=?", (now.isoformat(), hashlib.sha256(token.encode()).hexdigest()))
        self.assertEqual(self.client.get("/api/v1/admin/categories", headers=self.headers(token)).status_code, 401)
        token = self.login()
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE admin_accounts SET is_active=0")
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=self.headers(token)).status_code, 401)

    def test_logout_rejects_reuse(self):
        token = self.login()
        self.assertEqual(self.client.post("/api/v1/admin/logout", headers=self.headers(token)).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=self.headers(token)).status_code, 401)
        self.assertEqual(self.client.post("/api/v1/admin/logout", headers=self.headers(token)).status_code, 401)

    def test_create_update_and_normalized_duplicates(self):
        headers = self.headers(self.login())
        response = self.client.post("/api/v1/admin/categories", headers=headers, json={"name": "  Café  "})
        self.assertEqual(response.status_code, 201)
        item = response.json()
        self.assertEqual(item["name"], "Café")
        duplicate = self.client.post("/api/v1/admin/categories", headers=headers, json={"name": " CAFE\u0301 "})
        self.assertEqual(duplicate.status_code, 409)
        response = self.client.patch("/api/v1/admin/categories/" + item["id"], headers=headers, json={"name": "  Mới  "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Mới")
        duplicate = self.client.patch("/api/v1/admin/categories/" + item["id"], headers=headers, json={"name": " DI TÍCH "})
        self.assertEqual(duplicate.status_code, 409)
        names = [row["name"] for row in self.client.get("/api/v1/admin/categories", headers=headers).json()["items"]]
        self.assertIn("Mới", names)

    def test_empty_invalid_and_missing(self):
        headers = self.headers(self.login())
        for value in ("", "  \t ", "x" * 201):
            self.assertEqual(self.client.post("/api/v1/admin/categories", headers=headers, json={"name": value}).status_code, 422)
        self.assertEqual(self.client.patch("/api/v1/admin/categories/missing", headers=headers, json={"name": "Name"}).status_code, 404)
        self.assertEqual(self.client.delete("/api/v1/admin/categories/missing", headers=headers).status_code, 404)
        response = self.client.post("/api/v1/admin/login", json={"username": "admin", "password": self.password, "unexpected": self.password})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(self.password, response.text)

    def test_delete_used_and_unused(self):
        headers = self.headers(self.login())
        used = stable_id("category:history")
        response = self.client.delete("/api/v1/admin/categories/" + used, headers=headers)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"]["code"], "CATEGORY_IN_USE")
        created = self.client.post("/api/v1/admin/categories", headers=headers, json={"name": "Unused"}).json()["id"]
        self.assertEqual(self.client.delete("/api/v1/admin/categories/" + created, headers=headers).status_code, 204)
        self.assertEqual(self.client.delete("/api/v1/admin/categories/" + created, headers=headers).status_code, 404)


if __name__ == "__main__":
    unittest.main()
