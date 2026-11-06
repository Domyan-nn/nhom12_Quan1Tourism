"""Run the API against an explicitly selected, existing demo database.

No database is created, seeded or migrated. Normal API startup retention applies;
review and back up the selected database before using it for a demo.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args(argv)
    database = args.database.resolve()
    if not database.is_file():
        parser.error(f'Không tìm thấy database demo: {database}')
    if not 1 <= args.port <= 65535:
        parser.error('--port phải nằm trong khoảng 1–65535')
    env = os.environ.copy()
    env['SAIGON_DATABASE'] = str(database)
    return subprocess.call([sys.executable, '-m', 'uvicorn', 'app.main:app',
                            '--app-dir', str(BACKEND), '--host', args.host, '--port', str(args.port)], env=env)


if __name__ == '__main__':
    sys.exit(main())
