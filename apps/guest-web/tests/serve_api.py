"""Disposable API fixture for browser tests. Never reads a developer database."""
import os
import sqlite3
import subprocess
import sys
import tempfile
from contextlib import closing
from pathlib import Path

ROOT = Path(os.environ.get('SAIGON_TEST_ROOT', Path(__file__).resolve().parents[3]))
sys.path.insert(0, str(ROOT / 'backend'))
from scripts.seed_db import password_hash

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='saigon-browser-') as directory:
        database = Path(directory) / 'test.db'
        subprocess.run([sys.executable, str(ROOT / 'backend/scripts/init_db.py'), '--database', str(database)], check=True)
        with closing(sqlite3.connect(database)) as db, db:
            db.execute('PRAGMA foreign_keys=ON')
            db.execute('INSERT INTO admin_accounts VALUES (?,?,?,?,?,?)',
                       ('browser-admin', 'browser-admin', password_hash('browser-test-only'), 1, 'now', 'now'))
            for category, name_en in (('history', 'History'), ('culture', 'Culture')):
                db.execute('INSERT INTO categories (id,name,normalized_name,name_en,normalized_name_en,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
                           (category, category, category, name_en, name_en.casefold(), 'now', 'now'))
            for poi_id, name, category, status in [
                ('palace', 'Dinh Độc Lập', 'history', 'published'),
                ('market', 'Chợ Bến Thành', 'culture', 'published'),
                ('draft', 'Private draft', 'history', 'draft'),
                ('hidden', 'Private hidden', 'history', 'hidden'),
            ]:
                db.execute('INSERT INTO pois (id,category_id,name,address,latitude,longitude,radius_m,image_url,status,created_at,updated_at) '
                           'VALUES (?,?,?,?,?,?,?,NULL,?,?,?)',
                           (poi_id, category, name, 'Test address', 10.777 if poi_id == 'palace' else 10.772,
                            106.695 if poi_id == 'palace' else 106.699, 100, status, 'now', 'now'))
                for locale in ('vi', 'en', 'fr'):
                    db.execute('INSERT INTO poi_narrations VALUES (?,?,?,?,?,?,?)',
                               (poi_id + locale, poi_id, locale, 'Title ' + locale, 'Test body ' + locale, 'now', 'now'))
        os.environ['SAIGON_DATABASE'] = str(database)
        os.environ['SAIGON_UPLOADS'] = str(Path(directory) / 'uploads')  # uploaded test images die with the fixture
        from app.main import app
        from fastapi import HTTPException

        @app.get('/__test/analytics/{session_id}')
        def analytics_test_state(session_id: str):
            with closing(sqlite3.connect(database)) as db:
                row = db.execute('SELECT consent_granted FROM anonymous_sessions WHERE session_id=?', (session_id,)).fetchone()
                linked = db.execute('SELECT count(*) FROM visit_events WHERE session_id=?', (session_id,)).fetchone()[0]
                total = db.execute('SELECT count(*) FROM visit_events').fetchone()[0]
            return {'consent': row[0] if row else None, 'linked_visits': linked, 'total_visits': total}

        # Fixture-only control of this disposable DB; never imported by production.
        @app.put('/__test/pois/{poi_id}/status')
        def change_test_status(poi_id: str, status: str):
            if poi_id != 'palace' or status not in ('published', 'hidden'):
                raise HTTPException(400)
            with closing(sqlite3.connect(database)) as db, db:
                db.execute('UPDATE pois SET status=? WHERE id=?', (status, poi_id))
            return {'status': status}

        import uvicorn
        uvicorn.run(app, host=os.environ.get('SAIGON_TEST_HOST', '127.0.0.1'),
                    port=int(os.environ.get('SAIGON_TEST_PORT', '18082')))
