"""F07: upload, replace, serve and remove place images; photo credit (migration 004)."""
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import test_admin_api
from app.db.connection import connect
from app.services import media
from scripts.seed_db import stable_id

BASE = "/api/v1/admin/pois"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64


class PoiImageTests(unittest.TestCase):
    setUp_admin = test_admin_api.AdminAPITests.setUp
    login = test_admin_api.AdminAPITests.login
    headers = test_admin_api.AdminAPITests.headers

    def setUp(self):
        self.setUp_admin()
        uploads = tempfile.TemporaryDirectory()
        self.addCleanup(uploads.cleanup)
        self.uploads = Path(uploads.name)
        self.enterContext(patch.dict(os.environ, {"SAIGON_UPLOADS": str(self.uploads)}))
        self.h = self.headers(self.login())
        self.poi = stable_id("poi:dinh-doc-lap")

    def upload(self, data, content_type="image/png", poi=None):
        return self.client.put(f"{BASE}/{poi or self.poi}/image", content=data,
                               headers={**self.h, "Content-Type": content_type})

    def files(self):
        folder = self.uploads / "pois"
        return sorted(p.name for p in folder.iterdir()) if folder.exists() else []

    def place_body(self, **changes):
        body = {k: v for k, v in self.client.get(f"{BASE}/{self.poi}", headers=self.h).json().items()
                if k in ("category_id", "name", "address", "latitude", "longitude", "radius_m", "image_url", "image_credit")}
        return {**body, **changes}

    def test_upload_each_allowed_type_serves_it_and_replaces_the_old_file(self):
        for data, content_type, extension in ((PNG, "image/png", "png"), (JPEG, "image/jpeg", "jpg"), (WEBP, "image/webp", "webp")):
            with self.subTest(content_type=content_type):
                response = self.upload(data, content_type)
                self.assertEqual(response.status_code, 200, response.text)
                url = response.json()["image_url"]
                self.assertRegex(url, rf"^/api/media/pois/[0-9a-f-]{{36}}\.{extension}$")
                self.assertEqual(len(self.files()), 1)  # the previous upload was removed
                served = self.client.get(url)
                self.assertEqual(served.status_code, 200)
                self.assertEqual(served.content, data)
                self.assertEqual(served.headers["content-type"], content_type)
                self.assertEqual(served.headers["x-content-type-options"], "nosniff")

    def test_rejects_wrong_type_spoofed_content_oversize_and_missing_place(self):
        self.assertEqual(self.upload(b"GIF89a....", "image/gif").json()["error"]["code"], "UNSUPPORTED_IMAGE_TYPE")
        self.assertEqual(self.upload(b"<svg/>", "image/svg+xml").status_code, 415)
        spoofed = self.upload(b"<html>not an image</html>", "image/png")
        self.assertEqual((spoofed.status_code, spoofed.json()["error"]["code"]), (422, "INVALID_IMAGE"))
        self.assertEqual(self.upload(JPEG, "image/png").status_code, 422)  # declared type must match the bytes
        too_big = self.upload(PNG + b"\x00" * media.MAX_BYTES, "image/png")
        self.assertEqual((too_big.status_code, too_big.json()["error"]["code"]), (413, "IMAGE_TOO_LARGE"))
        self.assertEqual(self.upload(PNG, poi="missing").status_code, 404)
        self.assertEqual(self.files(), [])
        self.assertIsNone(self.client.get(f"{BASE}/{self.poi}", headers=self.h).json()["image_url"])

    def test_upload_and_delete_require_admin(self):
        self.assertEqual(self.client.put(f"{BASE}/{self.poi}/image", content=PNG, headers={"Content-Type": "image/png"}).status_code, 401)
        self.assertEqual(self.client.delete(f"{BASE}/{self.poi}/image").status_code, 401)
        self.assertEqual(self.files(), [])

    def test_credit_is_saved_trimmed_public_and_cleared_with_the_image(self):
        url = self.upload(PNG).json()["image_url"]
        saved = self.client.put(f"{BASE}/{self.poi}", headers=self.h,
                                json=self.place_body(image_credit="  Nhóm 12,\n CC BY 4.0  "))
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual((saved.json()["image_url"], saved.json()["image_credit"]), (url, "Nhóm 12, CC BY 4.0"))
        self.assertEqual(self.client.put(f"{BASE}/{self.poi}", headers=self.h, json=self.place_body(image_credit="x" * 301)).status_code, 422)
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE pois SET status='published' WHERE id=?", (self.poi,))
        public = self.client.get(f"/api/v1/pois/{self.poi}").json()
        self.assertEqual((public["image_url"], public["image_credit"]), (url, "Nhóm 12, CC BY 4.0"))
        removed = self.client.delete(f"{BASE}/{self.poi}/image", headers=self.h)
        self.assertEqual((removed.json()["image_url"], removed.json()["image_credit"]), (None, None))
        self.assertEqual(self.files(), [])
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_switching_to_url_or_deleting_place_removes_uploaded_file(self):
        self.upload(PNG)
        switched = self.client.put(f"{BASE}/{self.poi}", headers=self.h, json=self.place_body(image_url="https://example.org/a.jpg"))
        self.assertEqual(switched.json()["image_url"], "https://example.org/a.jpg")
        self.assertEqual(self.files(), [])
        self.upload(PNG)
        self.assertEqual(len(self.files()), 1)
        self.assertEqual(self.client.delete(f"{BASE}/{self.poi}", headers=self.h).status_code, 204)
        self.assertEqual(self.files(), [])
        self.assertEqual(self.client.delete(f"{BASE}/{self.poi}", headers=self.h).status_code, 404)

    def test_uploaded_url_cannot_be_reused_by_another_place_or_forged(self):
        url = self.upload(PNG).json()["image_url"]
        other = stable_id("poi:cho-ben-thanh")
        body = self.client.get(f"{BASE}/{other}", headers=self.h).json()
        body = {k: body[k] for k in ("category_id", "name", "address", "latitude", "longitude", "radius_m")}
        self.assertEqual(self.client.put(f"{BASE}/{other}", headers=self.h, json={**body, "image_url": url}).status_code, 422)
        for forged in ("/api/media/pois/../../secret.png", "/api/media/pois/not-a-uuid.png", "/etc/passwd", "file:///x.png"):
            with self.subTest(forged=forged):
                self.assertEqual(self.client.put(f"{BASE}/{other}", headers=self.h, json={**body, "image_url": forged}).status_code, 422)
        self.assertEqual(len(self.files()), 1)
        self.assertEqual(self.client.get("/api/media/pois/..%2F..%2Fapi-test.db").status_code, 404)
        self.assertEqual(self.client.get("/api/media/pois/00000000-0000-4000-8000-000000000000.png").status_code, 404)

    def test_publish_accepts_an_uploaded_image(self):
        self.upload(PNG)
        published = self.client.post(f"{BASE}/{self.poi}/publish", headers=self.h)
        self.assertEqual(published.status_code, 200, published.text)


class Migration004Tests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "v2.db"
        self.backup = Path(directory.name) / "backup.db"
        from scripts.migrate_db import upgrade_connection as upgrade_analytics
        from scripts.prepare_category_bilingual import upgrade_connection as upgrade_categories
        root = Path(test_admin_api.BACKEND)
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript((root / "migrations/001_initial.sql").read_text(encoding="utf-8"))
            upgrade_analytics(db)
            upgrade_categories(db)
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("INSERT INTO categories (id,name,normalized_name,created_at,updated_at) VALUES ('c','C','c','now','now')")
            db.execute("INSERT INTO pois (id,category_id,name,address,latitude,longitude,radius_m,image_url,status,created_at,updated_at) "
                       "VALUES ('p','c','P','A',10,106,100,'https://example.org/p.jpg','published','now','now')")

    def columns(self, path):
        with closing(sqlite3.connect(path)) as db:
            return [r[1] for r in db.execute("PRAGMA table_info(pois)")], db.execute("PRAGMA user_version").fetchone()[0]

    def test_check_then_apply_with_backup_keeps_rows(self):
        from scripts.migrate_004_poi_image_credit import migrate
        migrate(self.path, check_only=True)
        self.assertEqual(self.columns(self.path)[1], 2)
        migrate(self.path, backup=self.backup)
        columns, version = self.columns(self.path)
        self.assertIn("image_credit", columns)
        self.assertEqual(version, 4)
        self.assertEqual(self.columns(self.backup)[1], 2)
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(db.execute("SELECT image_url, image_credit FROM pois").fetchone(), ("https://example.org/p.jpg", None))
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("UPDATE pois SET image_credit = '   '")

    def test_refuses_repeat_missing_backup_and_wrong_version(self):
        from scripts.migrate_004_poi_image_credit import MigrationError, migrate
        with self.assertRaises(MigrationError):
            migrate(self.path)
        migrate(self.path, backup=self.backup)
        with self.assertRaises(MigrationError):
            migrate(self.path, check_only=True)
        legacy = self.path.parent / "legacy.db"
        with closing(sqlite3.connect(legacy)) as db:
            db.executescript((Path(test_admin_api.BACKEND) / "migrations/001_initial.sql").read_text(encoding="utf-8"))
        with self.assertRaises(MigrationError):
            migrate(legacy, check_only=True)

    def test_api_refuses_a_version_2_database(self):
        from fastapi.testclient import TestClient
        from app.main import app
        before = self.path.read_bytes()
        with patch.dict(os.environ, {"SAIGON_DATABASE": str(self.path), "SAIGON_DISABLE_CLEANUP": "1"}):
            with self.assertRaisesRegex(RuntimeError, "migrate_004"):
                with TestClient(app):
                    self.fail("A schema 2 database must not start")
        self.assertEqual(self.path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
