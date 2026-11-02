"""Run the local API against the existing demo database."""

import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DEMO_DATABASE = BACKEND / 'data' / 'preview-thu-nghiem-5826e873.db'


def main():
    if not DEMO_DATABASE.is_file():
        raise SystemExit(f'Không tìm thấy database demo: {DEMO_DATABASE}')
    env = os.environ.copy()
    env['SAIGON_DATABASE'] = str(DEMO_DATABASE)
    return subprocess.call([sys.executable, '-m', 'uvicorn', 'app.main:app',
                            '--app-dir', str(BACKEND), '--host', '127.0.0.1', '--port', '8000'], env=env)


if __name__ == '__main__':
    sys.exit(main())
