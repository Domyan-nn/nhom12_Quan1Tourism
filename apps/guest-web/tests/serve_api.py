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

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='saigon-browser-') as directory:
        database = Path(directory) / 'test.db'
        subprocess.run([sys.executable, str(ROOT / 'backend/scripts/init_db.py'), '--database', str(database)], check=True)
        with closing(sqlite3.connect(database)) as db, db:
            db.execute('PRAGMA foreign_keys=ON')
            for category, name_en in (('history', 'History'), ('culture', 'Culture')):
                db.execute('INSERT INTO categories (id,name,normalized_name,name_en,normalized_name_en,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
                           (category, category, category, name_en, name_en.casefold(), 'now', 'now'))
            for poi_id, name, category, status in [
                ('palace', 'Dinh Độc Lập', 'history', 'published'),
                ('market', 'Chợ Bến Thành', 'culture', 'published'),
                ('draft', 'Private draft', 'history', 'draft'),
                ('hidden', 'Private hidden', 'history', 'hidden'),
            ]:
                db.execute('INSERT INTO pois VALUES (?,?,?,?,?,?,?,NULL,?,?,?)',
                           (poi_id, category, name, 'Test address', 10.77, 106.69, 100, status, 'now', 'now'))
                for locale in ('vi', 'en', 'fr'):
                    db.execute('INSERT INTO poi_narrations VALUES (?,?,?,?,?,?,?)',
                               (poi_id + locale, poi_id, locale, 'Title ' + locale, 'Test body ' + locale, 'now', 'now'))
        os.environ['SAIGON_DATABASE'] = str(database)
        import uvicorn
        uvicorn.run('app.main:app', host='127.0.0.1', port=18082)
