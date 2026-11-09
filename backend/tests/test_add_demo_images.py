import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.api.routes.admin_pois import PlaceInput
from scripts.add_demo_images import IMAGES, add_images
from scripts.seed_db import PLACES, seed, stable_id


class AddDemoImagesTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.database = Path(self.tmp.name) / "test.db"
        result = subprocess.run([sys.executable, str(BACKEND / "scripts" / "init_db.py"), "--database", str(self.database)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        seed(self.database, "demo", "not-a-real-password")

    def images(self):
        with closing(sqlite3.connect(self.database)) as db:
            return dict(db.execute("SELECT id, image_url FROM pois"))

    def test_every_seeded_place_has_a_valid_licensed_image(self):
        self.assertEqual(set(IMAGES), {key for key, *_ in PLACES})
        for key, image in IMAGES.items():
            self.assertTrue(image["source"].startswith("https://commons.wikimedia.org/wiki/File:"), key)
            self.assertTrue(image["author"] and image["license"], key)
            # Same validator the Admin API uses (BR04).
            PlaceInput(category_id="c", name="n", address="a", latitude=10.0, longitude=106.0, image_url=image["url"])

    def test_preview_changes_nothing_and_apply_requires_backup(self):
        before = self.images()
        self.assertTrue(add_images(self.database, apply=False))
        self.assertEqual(before, self.images())
        with self.assertRaises(ValueError):
            add_images(self.database, apply=True)
        self.assertEqual(before, self.images())

    def test_apply_backs_up_then_fills_only_empty_images_and_is_idempotent(self):
        team = stable_id("poi:nha-hat")
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("UPDATE pois SET image_url = 'https://example.org/team.jpg' WHERE id = ?", (team,))
        backup = Path(self.tmp.name) / "before-images.db"
        report = "\n".join(add_images(self.database, apply=True, backup=backup))
        images = self.images()
        self.assertEqual(images[team], "https://example.org/team.jpg")
        self.assertIn("GIỮ NGUYÊN", report)
        for key in IMAGES.keys() - {"nha-hat"}:
            self.assertEqual(images[stable_id("poi:" + key)], IMAGES[key]["url"])
        with closing(sqlite3.connect(backup)) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM pois WHERE image_url LIKE 'https://upload.wikimedia.org/%'").fetchone()[0], 0)
        with self.assertRaises(FileExistsError):
            add_images(self.database, apply=True, backup=backup)
        again = add_images(self.database, apply=True, backup=Path(self.tmp.name) / "second.db")
        self.assertEqual(images, self.images())
        self.assertFalse(any("gắn ảnh" in line for line in again))


if __name__ == "__main__":
    unittest.main()
