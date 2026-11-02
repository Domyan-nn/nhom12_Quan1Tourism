"""Tests for the standalone, not-yet-integrated category migration."""

import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from scripts.prepare_category_bilingual import MigrationError, migrate


class CategoryPreparationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / 'test.db'
        self.backup = Path(self.directory.name) / 'backup.db'
        with closing(sqlite3.connect(self.database)) as db:
            db.executescript((BACKEND / 'migrations' / '001_initial.sql').read_text(encoding='utf-8'))

    def test_empty_new_database_check_and_migration(self):
        migrate(self.database, check_only=True)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertNotIn('name_en', [row[1] for row in db.execute('PRAGMA table_info(categories)')])
            version = db.execute('PRAGMA user_version').fetchone()[0]
        migrate(self.database, backup=self.backup)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertIn('name_en', [row[1] for row in db.execute('PRAGMA table_info(categories)')])
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], version)
        with closing(sqlite3.connect(self.backup)) as db:
            self.assertNotIn('name_en', [row[1] for row in db.execute('PRAGMA table_info(categories)')])

    def test_existing_rows_and_relations_survive(self):
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("INSERT INTO categories VALUES ('cat','Tên cũ','tên cũ','now','now')")
            db.execute("INSERT INTO pois VALUES ('poi','cat','Place','Address',0,0,100,NULL,'draft','now','now')")
        migrate(self.database, backup=self.backup)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute('SELECT id,name,name_en,normalized_name_en FROM categories').fetchall(),
                             [('cat', 'Tên cũ', None, None)])
            self.assertEqual(db.execute('SELECT id,category_id FROM pois').fetchall(), [('poi', 'cat')])
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
            db.execute('PRAGMA foreign_keys=ON')
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("DELETE FROM categories WHERE id='cat'")
        with closing(sqlite3.connect(self.backup)) as db:
            self.assertEqual(db.execute('SELECT id,name FROM categories').fetchall(), [('cat', 'Tên cũ')])
            self.assertEqual(db.execute('SELECT id,category_id FROM pois').fetchall(), [('poi', 'cat')])

    def test_refuses_unsafe_or_repeated_application(self):
        with self.assertRaises(MigrationError):
            migrate(self.database)
        self.backup.write_bytes(b'preserve')
        with self.assertRaises(FileExistsError):
            migrate(self.database, backup=self.backup)
        self.assertEqual(self.backup.read_bytes(), b'preserve')
        self.backup.unlink()
        migrate(self.database, backup=self.backup)
        with self.assertRaises(MigrationError):
            migrate(self.database, check_only=True)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(len([r for r in db.execute('PRAGMA table_info(categories)') if r[1] == 'name_en']), 1)

    def test_existing_foreign_key_violation_leaves_schema_unchanged(self):
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("INSERT INTO pois VALUES ('bad','missing','Place','Address',0,0,100,NULL,'draft','now','now')")
        with self.assertRaises(MigrationError):
            migrate(self.database, backup=self.backup)
        with closing(sqlite3.connect(self.database)) as db:
            self.assertNotIn('name_en', [r[1] for r in db.execute('PRAGMA table_info(categories)')])
            self.assertEqual(db.execute('SELECT category_id FROM pois').fetchone()[0], 'missing')
        self.assertTrue(self.backup.exists())


if __name__ == '__main__':
    unittest.main()
