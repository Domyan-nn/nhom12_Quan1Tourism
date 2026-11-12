"""UC12 through the production FastAPI app, real dependencies and disposable SQLite."""
import asyncio
import os
import sqlite3
import sys
import tempfile
import threading
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app.main import app
from app.services import analytics_service as svc, analytics_retention as retention
from scripts.migrate_db import upgrade_connection
from scripts.prepare_category_bilingual import upgrade_connection as upgrade_categories
from scripts.migrate_004_poi_image_credit import upgrade_connection as upgrade_image_credit
from scripts.migrate_005_admin_audit_log import upgrade_connection as upgrade_audit_log


def initialize(path):
    with closing(sqlite3.connect(path)) as db:
        db.executescript((BACKEND / 'migrations/001_initial.sql').read_text(encoding='utf-8'))
        upgrade_connection(db)
        upgrade_categories(db)
        upgrade_image_credit(db)
        upgrade_audit_log(db)


class MainAnalyticsTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='saigon-uc12-')
        self.addCleanup(directory.cleanup)
        self.database = Path(directory.name) / 'test.db'
        initialize(self.database)
        self.enterContext(patch.dict(os.environ, {'SAIGON_DATABASE': str(self.database)}))

    def start(self):
        # No dependency override: main must use SAIGON_DATABASE and its real router.
        return self.enterContext(TestClient(app))

    def rows(self, sql):
        with closing(sqlite3.connect(self.database)) as db:
            return db.execute(sql).fetchall()

    def test_v1_and_legacy_routes_share_consent_and_idempotent_revoke(self):
        client = self.start()
        client.get('/api/v1/pois')
        self.assertEqual(self.rows('SELECT * FROM anonymous_sessions'), [])
        payload = {'session_id': str(uuid.uuid4())}
        for prefix in ('/api/v1/analytics', '/api/analytics'):
            self.assertEqual(client.post(prefix + '/heartbeat', json=payload).status_code, 204)
        self.assertEqual(self.rows('SELECT count(*) FROM visit_events'), [(1,)])
        for prefix in ('/api/analytics', '/api/v1/analytics'):
            self.assertEqual(client.post(prefix + '/revoke', json=payload).status_code, 204)
            response = client.post(prefix + '/heartbeat', json=payload)
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.json()['detail'], 'session_revoked')
        self.assertEqual(self.rows('SELECT session_id FROM visit_events'), [(None,)])
        self.assertEqual(self.rows('SELECT consent_granted FROM anonymous_sessions'), [(0,)])

    def test_invalid_uuid_version_and_variant_are_422_without_writes(self):
        client = self.start()
        for bad in ('bad', str(uuid.uuid1()), '00000000-0000-4000-0000-000000000000', None):
            for prefix in ('/api/v1/analytics', '/api/analytics'):
                for action in ('heartbeat', 'revoke'):
                    self.assertEqual(client.post(prefix + '/' + action, json={'session_id': bad}).status_code, 422)
        self.assertEqual(self.rows('SELECT * FROM anonymous_sessions'), [])

    def test_main_routes_respect_exact_30_minute_gap(self):
        client = self.start()
        now = datetime(2026, 11, 4, 3, tzinfo=timezone.utc)
        payload = {'session_id': str(uuid.uuid4()).upper()}
        for delta in (timedelta(), timedelta(minutes=30), timedelta(minutes=30, seconds=30)):
            with patch.object(svc, 'utcnow', return_value=now + delta):
                self.assertEqual(client.post('/api/v1/analytics/heartbeat', json=payload).status_code, 204)
        self.assertEqual(self.rows('SELECT count(*) FROM visit_events'), [(2,)])

    def test_concurrent_requests_deduplicate_and_revoke_wins_over_late_heartbeats(self):
        client = self.start()
        payload = {'session_id': str(uuid.uuid4())}
        barrier = threading.Barrier(8)

        def post(action):
            barrier.wait(timeout=10)
            return client.post('/api/v1/analytics/' + action, json=payload).status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            self.assertEqual(list(pool.map(post, ['heartbeat'] * 8)), [204] * 8)
        self.assertEqual(self.rows('SELECT count(*) FROM visit_events'), [(1,)])
        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(post, ['revoke'] + ['heartbeat'] * 7))
        self.assertEqual(statuses[0], 204)
        self.assertTrue(all(s in (204, 409) for s in statuses[1:]))
        self.assertEqual(self.rows('SELECT consent_granted FROM anonymous_sessions'), [(0,)])
        self.assertEqual(self.rows('SELECT session_id FROM visit_events'), [(None,)])
        self.assertEqual(client.post('/api/analytics/heartbeat', json=payload).status_code, 409)

    def test_startup_really_cleans_only_expired_data(self):
        now = svc.utcnow()
        with closing(sqlite3.connect(self.database)) as db:
            db.execute('PRAGMA foreign_keys=ON')
            svc.record_heartbeat(db, str(uuid.uuid4()), now - timedelta(days=40))
            svc.record_heartbeat(db, str(uuid.uuid4()), now)
        self.start()
        self.assertEqual(self.rows('SELECT count(*) FROM anonymous_sessions'), [(1,)])
        self.assertEqual(self.rows('SELECT count(*) FROM visit_events'), [(1,)])


class RetentionScheduleTests(unittest.IsolatedAsyncioTestCase):
    async def test_midnight_loop_triggers_real_cleanup_on_temporary_database(self):
        with tempfile.TemporaryDirectory(prefix='saigon-retention-') as directory:
            database = Path(directory) / 'test.db'
            initialize(database)
            now = datetime(2026, 11, 3, 16, 59, 59, tzinfo=timezone.utc)  # VN 23:59:59
            expires = svc.retention_cutoff(now)
            with closing(sqlite3.connect(database)) as db:
                svc.record_heartbeat(db, str(uuid.uuid4()), expires)
            delays = []

            async def sleep(seconds):
                nonlocal now
                delays.append(seconds)
                if len(delays) > 1:
                    raise asyncio.CancelledError
                now += timedelta(seconds=seconds)

            with self.assertRaises(asyncio.CancelledError):
                await retention.retention_loop(database, sleep=sleep, clock=lambda: now)
            self.assertEqual(delays, [1, 86400])
            with closing(sqlite3.connect(database)) as db:
                self.assertEqual(db.execute('SELECT count(*) FROM visit_events').fetchone()[0], 0)

    async def test_cleanup_failure_is_logged_and_retried_after_one_minute(self):
        delays = []
        now = datetime(2026, 11, 3, 16, 59, 59, tzinfo=timezone.utc)

        async def sleep(seconds):
            delays.append(seconds)
            if len(delays) == 3:
                raise asyncio.CancelledError

        with patch.object(retention, 'cleanup_database', side_effect=[sqlite3.OperationalError('locked'), {}]) as clean:
            with self.assertLogs(retention.logger, level='ERROR'):
                with self.assertRaises(asyncio.CancelledError):
                    await retention.retention_loop('unused', sleep=sleep, clock=lambda: now)
        self.assertEqual(delays[:2], [1, 60])
        self.assertEqual(clean.call_count, 2)
