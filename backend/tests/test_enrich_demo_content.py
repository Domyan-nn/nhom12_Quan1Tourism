import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from scripts.demo_content import CONTENT
from scripts.enrich_demo_content import PLACEHOLDER_TITLE_PREFIXES, enrich
from scripts.seed_db import PLACES, seed, stable_id


class EnrichDemoContentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.database = Path(self.tmp.name) / "test.db"
        result = subprocess.run([sys.executable, str(BACKEND / "scripts" / "init_db.py"), "--database", str(self.database)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        seed(self.database, "demo", "not-a-real-password")

    def rows(self, sql, *args):
        with sqlite3.connect(self.database) as db:
            db.row_factory = sqlite3.Row
            return db.execute(sql, args).fetchall()

    def test_content_covers_every_seeded_place_in_both_languages(self):
        self.assertEqual(set(CONTENT), {key for key, *_ in PLACES})
        for key, item in CONTENT.items():
            self.assertEqual(set(item["narrations"]), {"vi", "en"}, key)
            for locale, (title, body) in item["narrations"].items():
                self.assertTrue(title.strip() and body.strip(), (key, locale))
                self.assertLessEqual(len(title), 500)
                self.assertGreater(len(body.split()), 40, (key, locale))
                self.assertFalse(title.startswith(PLACEHOLDER_TITLE_PREFIXES))

    def test_dry_run_changes_nothing(self):
        before = self.rows("SELECT title, body FROM poi_narrations ORDER BY id")
        report = enrich(self.database, apply=False)
        self.assertTrue(report)
        self.assertEqual(before, self.rows("SELECT title, body FROM poi_narrations ORDER BY id"))

    def test_apply_replaces_placeholders_and_keeps_drafts(self):
        enrich(self.database, apply=True)
        for key in CONTENT:
            poi_id = stable_id("poi:" + key)
            locales = {r["locale"]: r for r in self.rows("SELECT locale, title, body FROM poi_narrations WHERE poi_id = ?", poi_id)}
            self.assertEqual(set(locales), {"vi", "en"})
            for locale, (title, body) in CONTENT[key]["narrations"].items():
                self.assertEqual((locales[locale]["title"], locales[locale]["body"]), (title, body))
        self.assertEqual({r["status"] for r in self.rows("SELECT status FROM pois")}, {"draft"})
        market = self.rows("SELECT latitude, longitude FROM pois WHERE id = ?", stable_id("poi:cho-ben-thanh"))[0]
        self.assertEqual((market["latitude"], market["longitude"]), CONTENT["cho-ben-thanh"]["coordinates"])

    def test_is_idempotent(self):
        enrich(self.database, apply=True)
        first = self.rows("SELECT id, title, body, updated_at FROM poi_narrations ORDER BY id")
        report = enrich(self.database, apply=True)
        self.assertEqual(first, self.rows("SELECT id, title, body, updated_at FROM poi_narrations ORDER BY id"))
        self.assertEqual(self.rows("SELECT COUNT(*) AS n FROM poi_narrations")[0]["n"], 10)
        self.assertTrue(all("đã là nội dung này" in line or "giữ" in line.lower() for line in report))

    def test_never_overwrites_team_edits(self):
        poi_id = stable_id("poi:nha-hat")
        with sqlite3.connect(self.database) as db:
            db.execute("UPDATE poi_narrations SET title = ?, body = ? WHERE poi_id = ? AND locale = 'vi'", ("Bản của nhóm", "Nội dung nhóm tự viết.", poi_id))
            db.execute("UPDATE pois SET address = ?, latitude = ? WHERE id = ?", ("Địa chỉ nhóm sửa", 10.5, stable_id("poi:cho-ben-thanh")))
        report = "\n".join(enrich(self.database, apply=True))
        vi = self.rows("SELECT title, body FROM poi_narrations WHERE poi_id = ? AND locale = 'vi'", poi_id)[0]
        self.assertEqual((vi["title"], vi["body"]), ("Bản của nhóm", "Nội dung nhóm tự viết."))
        market = self.rows("SELECT address, latitude FROM pois WHERE id = ?", stable_id("poi:cho-ben-thanh"))[0]
        self.assertEqual((market["address"], market["latitude"]), ("Địa chỉ nhóm sửa", 10.5))
        self.assertIn("GIỮ NGUYÊN", report)

    def test_skips_places_that_were_not_seeded(self):
        with sqlite3.connect(self.database) as db:
            db.execute("PRAGMA foreign_keys = ON")
            db.execute("DELETE FROM pois WHERE id = ?", (stable_id("poi:buu-dien"),))
        report = "\n".join(enrich(self.database, apply=True))
        self.assertIn("[buu-dien] BỎ QUA", report)


if __name__ == "__main__":
    unittest.main()
