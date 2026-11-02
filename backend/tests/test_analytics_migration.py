import sqlite3
import subprocess
import sys
import tempfile
import unittest
import uuid
from contextlib import closing
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from scripts.migrate_db import MigrationError, migrate, upgrade_connection

SID = '9d7a4c2e-1f3b-4a8e-b5c6-2e8f0a1d3c77'
EVENT = str(uuid.uuid4())
NOW = '2026-11-02T03:00:00.123Z'


class AnalyticsMigrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'legacy.db'
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript((BACKEND / 'migrations/001_initial.sql').read_text(encoding='utf-8'))

    def insert_valid(self):
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute('INSERT INTO anonymous_sessions VALUES (?, 1, ?, ?)', (SID, NOW, NOW))
            db.execute('INSERT INTO visit_events VALUES (?, ?, ?)', (EVENT, SID, NOW))
            db.execute("INSERT INTO categories (id, name, normalized_name, created_at, updated_at) VALUES ('keep', 'Keep', 'keep', 'now', 'now')")

    def test_new_database_has_version_and_constraints(self):
        new_path = self.path.parent / 'new.db'
        result = subprocess.run([sys.executable, str(BACKEND / 'scripts/init_db.py'), '--database', str(new_path)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        with closing(sqlite3.connect(new_path)) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 2)
            self.assert_constraints(db)

    def test_upgrade_preserves_rows_backup_and_foreign_keys(self):
        self.insert_valid()
        backup = self.path.parent / 'backup.db'
        migrate(self.path, backup=backup)
        with closing(sqlite3.connect(backup)) as db:
            self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT * FROM visit_events').fetchall(), [(EVENT, SID, NOW)])
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(db.execute('SELECT * FROM anonymous_sessions').fetchall(), [(SID, 1, NOW, NOW)])
            self.assertEqual(db.execute('SELECT * FROM visit_events').fetchall(), [(EVENT, SID, NOW)])
            self.assertEqual(db.execute('SELECT name FROM categories').fetchone()[0], 'Keep')
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
            indexes = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='index'")}
            self.assertTrue({'idx_anonymous_sessions_last_seen_at', 'idx_visit_events_session_id', 'idx_visit_events_started_at'} <= indexes)
            self.assert_constraints(db)
            db.execute('DELETE FROM anonymous_sessions WHERE session_id=?', (SID,))
            self.assertIsNone(db.execute('SELECT session_id FROM visit_events').fetchone()[0])

    def assert_constraints(self, db):
        db.execute('PRAGMA foreign_keys=ON')
        for sid, consent, created, seen in [
            ('x' * 36, 1, NOW, NOW), (SID.upper(), 1, NOW, NOW),
            (SID, 2, NOW, NOW), (SID, 1, '2026-11-02', NOW),
            (SID, 1, NOW, '2026-11-02T03:00:00.122Z'),
            (SID, 1, NOW, '2026-02-30T03:00:00.123Z'),
            (SID, 1, NOW, '2026-11-02T25:00:00.123Z'),
        ]:
            with self.subTest(sid=sid, consent=consent, created=created, seen=seen), self.assertRaises(sqlite3.IntegrityError):
                db.execute('INSERT OR REPLACE INTO anonymous_sessions VALUES (?,?,?,?)', (sid, consent, created, seen))
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute('INSERT INTO visit_events VALUES (?,?,?)', (str(uuid.uuid4()), str(uuid.uuid4()), NOW))
        for event_id, started in [('x'*36, NOW), (str(uuid.uuid4()), '2026-02-30T03:00:00.123Z')]:
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute('INSERT INTO visit_events VALUES (?,NULL,?)', (event_id, started))
        db.execute('INSERT INTO visit_events VALUES (?,NULL,?)', (str(uuid.uuid4()), NOW))
        default_sid = str(uuid.uuid4())
        db.execute('INSERT INTO anonymous_sessions(session_id,created_at,last_seen_at) VALUES (?,?,?)', (default_sid, NOW, NOW))
        self.assertEqual(db.execute('SELECT consent_granted FROM anonymous_sessions WHERE session_id=?', (default_sid,)).fetchone()[0], 1)

    def test_check_and_repeated_upgrade_preserve_data(self):
        self.insert_valid()
        before = self.path.read_bytes()
        migrate(self.path, check_only=True)
        self.assertEqual(self.path.read_bytes(), before)
        for number in range(2):
            migrate(self.path, backup=self.path.parent / f'backup-{number}.db')
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(db.execute('SELECT * FROM visit_events').fetchall(), [(EVENT, SID, NOW)])

    def test_invalid_old_data_rolls_back_schema_and_rows(self):
        for invalid in ['session', 'time', 'consent', 'orphan', 'event']:
            with self.subTest(invalid=invalid), closing(sqlite3.connect(':memory:')) as db:
                db.executescript((BACKEND / 'migrations/001_initial.sql').read_text(encoding='utf-8'))
                db.execute('PRAGMA ignore_check_constraints=ON')
                db.execute('INSERT INTO anonymous_sessions VALUES (?,?,?,?)',
                           ('x'*36 if invalid == 'session' else SID, 9 if invalid == 'consent' else 1,
                            NOW, '2026-02-30T03:00:00.123Z' if invalid == 'time' else NOW))
                db.execute('INSERT INTO visit_events VALUES (?,?,?)',
                           ('bad' if invalid == 'event' else EVENT, str(uuid.uuid4()) if invalid == 'orphan' else ('x'*36 if invalid == 'session' else SID), NOW))
                db.commit()
                db.execute('PRAGMA ignore_check_constraints=OFF')
                before = list(db.iterdump())
                with self.assertRaises(MigrationError):
                    upgrade_connection(db)
                self.assertEqual(list(db.iterdump()), before)
                self.assertEqual(db.execute('PRAGMA foreign_keys').fetchone()[0], 1)

    def test_backup_required_and_no_overwrite_or_missing_creation(self):
        with self.assertRaises(MigrationError):
            migrate(self.path)
        with self.assertRaises(FileExistsError):
            migrate(self.path, backup=self.path)
        missing = self.path.parent / 'missing.db'
        with self.assertRaises(sqlite3.OperationalError):
            migrate(missing, check_only=True)
        self.assertFalse(missing.exists())

    def test_custom_dependencies_are_not_silently_dropped(self):
        with closing(sqlite3.connect(self.path)) as db:
            db.execute('CREATE INDEX custom_consent ON anonymous_sessions(consent_granted)')
        with self.assertRaisesRegex(MigrationError, 'Custom index'):
            migrate(self.path, check_only=True)

    def test_create_if_not_exists_cannot_upgrade_old_constraints(self):
        with closing(sqlite3.connect(self.path)) as db:
            db.execute('CREATE TABLE IF NOT EXISTS anonymous_sessions (session_id TEXT CHECK(length(session_id)=36))')
            db.execute("INSERT INTO anonymous_sessions VALUES ('short',1,'now','now')")
            db.commit()
        with self.assertRaises(MigrationError):
            migrate(self.path, check_only=True)

    def test_upgrade_legacy_standalone_schema_and_index_names(self):
        with closing(sqlite3.connect(':memory:')) as db:
            db.executescript('''
                CREATE TABLE anonymous_sessions (
                    session_id TEXT PRIMARY KEY NOT NULL CHECK(length(session_id)=36),
                    consent_granted INTEGER NOT NULL DEFAULT 1 CHECK(consent_granted IN (0,1)),
                    created_at TEXT NOT NULL CHECK(length(created_at)=24),
                    last_seen_at TEXT NOT NULL CHECK(length(last_seen_at)=24), CHECK(last_seen_at>=created_at));
                CREATE TABLE visit_events (
                    id TEXT PRIMARY KEY NOT NULL CHECK(length(id)=36),
                    session_id TEXT REFERENCES anonymous_sessions(session_id) ON DELETE SET NULL,
                    started_at TEXT NOT NULL CHECK(length(started_at)=24));
                CREATE INDEX idx_anonymous_sessions_last_seen ON anonymous_sessions(last_seen_at);
                CREATE INDEX idx_visit_events_session ON visit_events(session_id);
                CREATE INDEX idx_visit_events_started_at ON visit_events(started_at);
            ''')
            db.execute('INSERT INTO anonymous_sessions VALUES (?,0,?,?)', (SID, NOW, NOW))
            db.execute('INSERT INTO visit_events VALUES (?,NULL,?)', (EVENT, NOW))
            db.commit()
            upgrade_connection(db)
            self.assertEqual(db.execute('SELECT consent_granted FROM anonymous_sessions').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT * FROM visit_events').fetchall(), [(EVENT, None, NOW)])
            indexes = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='index'")}
            self.assertNotIn('idx_anonymous_sessions_last_seen', indexes)
            self.assertIn('idx_anonymous_sessions_last_seen_at', indexes)


if __name__ == '__main__':
    unittest.main()
