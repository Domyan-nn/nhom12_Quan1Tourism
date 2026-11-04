import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.main import app


class StartupTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / 'test.db'

    def start(self):
        return TestClient(app)

    def test_current_database_starts_and_serves_categories(self):
        subprocess.run([sys.executable, str(BACKEND / 'scripts' / 'init_db.py'),
                        '--database', str(self.database)], check=True, capture_output=True)
        with patch.dict(os.environ, {'SAIGON_DATABASE': str(self.database)}):
            with self.start() as client:
                self.assertEqual(client.get('/api/v1/categories').json(), {'items': []})

    def test_legacy_schema_fails_at_startup_without_changes(self):
        with closing(sqlite3.connect(self.database)) as db:
            db.executescript((BACKEND / 'migrations' / '001_initial.sql').read_text(encoding='utf-8'))
        before = self.database.read_bytes()
        with patch.dict(os.environ, {'SAIGON_DATABASE': str(self.database)}):
            with self.assertRaisesRegex(RuntimeError, 'name_en') as error:
                with self.start():
                    self.fail('Legacy database must not start')
        self.assertIn(str(self.database), str(error.exception))
        self.assertEqual(self.database.read_bytes(), before)

    def test_missing_database_is_not_created(self):
        with patch.dict(os.environ, {'SAIGON_DATABASE': str(self.database)}):
            with self.assertRaisesRegex(RuntimeError, 'SAIGON_DATABASE'):
                with self.start():
                    self.fail('Missing database must not start')
        self.assertFalse(self.database.exists())

    def test_analytics_upgrade_required_before_retention_can_write(self):
        from scripts.prepare_category_bilingual import upgrade_connection
        with closing(sqlite3.connect(self.database)) as db:
            db.executescript((BACKEND / 'migrations' / '001_initial.sql').read_text(encoding='utf-8'))
            upgrade_connection(db)
        before = self.database.read_bytes()
        with patch.dict(os.environ, {'SAIGON_DATABASE': str(self.database)}):
            with self.assertRaisesRegex(RuntimeError, 'migrate_db.py'):
                with self.start():
                    self.fail('Unmigrated analytics must not start')
        self.assertEqual(self.database.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
