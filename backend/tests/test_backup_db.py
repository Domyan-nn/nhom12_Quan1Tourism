import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.backup_db import backup_database


class BackupTests(unittest.TestCase):
    def test_wal_snapshot_and_restore_preserve_committed_data_and_version(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "nguồn # thử.db"
            backup = Path(directory) / "backup.db"
            restored = Path(directory) / "restored.db"
            with closing(sqlite3.connect(source)) as writer:
                writer.execute("PRAGMA journal_mode=WAL")
                writer.execute("PRAGMA user_version=2")
                writer.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY, name TEXT)")
                writer.execute("INSERT INTO sample VALUES (1, 'Dữ liệu đã lưu')")
                writer.commit()
                writer.execute("INSERT INTO sample VALUES (2, 'Chưa commit')")
                backup_database(source, backup)
                writer.rollback()
                backup_database(backup, restored)
                for database in (source, backup, restored):
                    with closing(sqlite3.connect(database)) as db:
                        self.assertEqual(db.execute("SELECT * FROM sample").fetchall(), [(1, "Dữ liệu đã lưu")])
                        self.assertEqual(db.execute("PRAGMA user_version").fetchone()[0], 2)

    def test_refuses_missing_source_existing_target_and_same_path(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.db"
            target = Path(directory) / "keep.db"
            with self.assertRaises(sqlite3.Error):
                backup_database(source, target)
            self.assertFalse(source.exists())
            self.assertFalse(target.exists())
            with closing(sqlite3.connect(source)) as db:
                db.execute("CREATE TABLE keep (id INTEGER)")
            original = source.read_bytes()
            target.write_bytes(b"keep existing file")
            for destination in (source, target):
                with self.assertRaises(FileExistsError):
                    backup_database(source, destination)
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual(target.read_bytes(), b"keep existing file")

    def test_rejects_foreign_key_violations_in_snapshot_without_changing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.db"
            with closing(sqlite3.connect(source)) as db:
                db.executescript("CREATE TABLE parent(id PRIMARY KEY); CREATE TABLE child(id REFERENCES parent(id)); INSERT INTO child VALUES(1);")
            original = source.read_bytes()
            with self.assertRaisesRegex(ValueError, "foreign key"):
                backup_database(source, Path(directory) / "invalid.db")
            self.assertEqual(source.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
