import base64
import hashlib
import io
import secrets
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing, redirect_stdout
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.db.connection import connect
from scripts.seed_db import seed, stable_id
from scripts import seed_db

INIT = BACKEND / "scripts" / "init_db.py"
TABLES = {"admin_accounts", "admin_sessions", "categories", "pois", "poi_narrations", "anonymous_sessions", "visit_events"}


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / "test.db"
        result = subprocess.run([sys.executable, str(INIT), "--database", str(self.database)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_init_tables_and_refusal_preserves_existing_data(self):
        with closing(connect(self.database)) as db, db:
            tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            self.assertEqual(tables, TABLES)
            db.execute("INSERT INTO categories (id, name, normalized_name, created_at, updated_at) VALUES ('keep','Keep','keep','now','now')")
        result = subprocess.run([sys.executable, str(INIT), "--database", str(self.database)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        with closing(connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT name FROM categories WHERE id='keep'").fetchone()[0], "Keep")

    def test_connection_foreign_keys_and_missing_database(self):
        with self.assertRaises(sqlite3.OperationalError):
            connect(self.database.parent / "missing.db")
        self.assertFalse((self.database.parent / "missing.db").exists())
        for _ in range(2):
            db = connect(self.database)
            try:
                self.assertEqual(db.execute("PRAGMA foreign_keys").fetchone()[0], 1)
                with self.assertRaises(sqlite3.IntegrityError):
                    db.execute("INSERT INTO admin_sessions VALUES ('s','missing','hash','2026-01-01','2026-01-02',NULL)")
            finally:
                db.close()

    def test_constraints_and_delete_rules(self):
        db = connect(self.database)
        self.addCleanup(db.close)
        db.execute("INSERT INTO categories (id, name, normalized_name, created_at, updated_at) VALUES ('c','Name','name','now','now')")
        statement = "INSERT INTO pois VALUES (?, ?, 'Place', 'Address', ?, ?, ?, NULL, 'draft', 'now', 'now')"
        for lat, lon, radius in [(91, 0, 100), (-91, 0, 100), (0, 181, 100), (0, -181, 100), (0, 0, 19), (0, 0, 1001)]:
            with self.subTest(lat=lat, lon=lon, radius=radius), self.assertRaises(sqlite3.IntegrityError):
                db.execute(statement, ('bad', 'c', lat, lon, radius))
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute(statement, ('bad', 'missing', 0, 0, 100))
        db.execute(statement, ('p', 'c', 90, -180, 20))
        db.execute(statement, ('p2', 'c', -90, 180, 1000))
        db.execute("INSERT INTO poi_narrations VALUES ('n','p','vi','title','body','now','now')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO poi_narrations VALUES ('n2','p','vi','title','body','now','now')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("DELETE FROM categories WHERE id='c'")
        db.execute("DELETE FROM pois WHERE id='p'")
        self.assertEqual(db.execute("SELECT COUNT(*) FROM poi_narrations").fetchone()[0], 0)

    def test_seed_repeat_preserves_edits_and_password(self):
        test_password = secrets.token_urlsafe(24)
        seed(self.database, " DemoAdmin ", test_password)
        db = connect(self.database)
        with db:
            counts = [db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ("categories", "pois", "poi_narrations", "admin_accounts")]
            self.assertEqual(counts, [2, 5, 6, 1])
            self.assertEqual(db.execute("SELECT COUNT(*) FROM pois WHERE status='draft' AND image_url IS NULL").fetchone()[0], 5)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM pois p WHERE NOT EXISTS (SELECT 1 FROM poi_narrations n WHERE n.poi_id=p.id)").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(DISTINCT locale) FROM poi_narrations WHERE poi_id=?", (stable_id("poi:dinh-doc-lap"),)).fetchone()[0], 2)
            stored = db.execute("SELECT password_hash FROM admin_accounts").fetchone()[0]
            algorithm, iterations, salt, digest = stored.split("$")
            self.assertEqual(algorithm, "pbkdf2_sha256")
            self.assertEqual(hashlib.pbkdf2_hmac("sha256", test_password.encode(), base64.b64decode(salt), int(iterations)), base64.b64decode(digest))
            db.execute("UPDATE pois SET address='User edit' WHERE id=?", (stable_id("poi:dinh-doc-lap"),))
            db.execute("UPDATE poi_narrations SET body='User edit' WHERE poi_id=? AND locale='vi'", (stable_id("poi:dinh-doc-lap"),))
        db.close()
        seed(self.database, "demoadmin", secrets.token_urlsafe(24))
        db = connect(self.database)
        self.addCleanup(db.close)
        self.assertEqual([db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ("categories", "pois", "poi_narrations", "admin_accounts")], counts)
        self.assertEqual(db.execute("SELECT address FROM pois WHERE id=?", (stable_id("poi:dinh-doc-lap"),)).fetchone()[0], "User edit")
        self.assertEqual(db.execute("SELECT body FROM poi_narrations WHERE poi_id=? AND locale='vi'", (stable_id("poi:dinh-doc-lap"),)).fetchone()[0], "User edit")
        self.assertEqual(db.execute("SELECT password_hash FROM admin_accounts").fetchone()[0], stored)

    def test_collision_rolls_back_whole_seed(self):
        db = connect(self.database)
        with db:
            db.execute("INSERT INTO categories (id, name, normalized_name, created_at, updated_at) VALUES ('other','Di tích','di tích','now','now')")
        db.close()
        with self.assertRaises(ValueError):
            seed(self.database, "demo", secrets.token_urlsafe(24))
        db = connect(self.database)
        self.addCleanup(db.close)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM admin_accounts").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM pois").fetchone()[0], 0)

    def test_seed_command_line(self):
        test_password = secrets.token_urlsafe(24)
        arguments = ["seed_db.py", "--database", str(self.database), "--username", "cli-demo"]
        for _ in range(2):
            output = io.StringIO()
            with patch.object(sys, "argv", arguments), patch.object(seed_db.getpass, "getpass", return_value=test_password), redirect_stdout(output):
                seed_db.main()
            self.assertNotIn(test_password, output.getvalue())
        with closing(connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM pois").fetchone()[0], 5)


if __name__ == "__main__":
    unittest.main()
