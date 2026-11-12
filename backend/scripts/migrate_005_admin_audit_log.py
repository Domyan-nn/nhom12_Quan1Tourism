"""Apply migrations/005_admin_audit_log.sql (Admin audit log table) to an existing database.

Requires a database at schema version 4 (migration 004: pois.image_credit).
Stop all database writers first. --check tries the upgrade on an in-memory copy only; applying
requires --backup pointing to a new file. Any failure rolls the whole transaction back.
"""

import argparse
import sqlite3
from contextlib import closing
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[1] / 'migrations' / '005_admin_audit_log.sql'
TARGET_VERSION = 5


class MigrationError(ValueError):
    pass


def statements():
    pending = ''
    for line in MIGRATION.read_text(encoding='utf-8').splitlines():
        if not pending and line.lstrip().startswith('--'):
            continue
        pending += line + '\n'
        if sqlite3.complete_statement(pending):
            yield pending
            pending = ''
    if pending.strip():
        raise MigrationError('Incomplete migration SQL')


def upgrade_connection(db):
    if db.in_transaction:
        raise MigrationError('An active transaction is not supported.')
    try:
        db.execute('PRAGMA foreign_keys = ON')
        db.execute('BEGIN IMMEDIATE')
        version = db.execute('PRAGMA user_version').fetchone()[0]
        if version == TARGET_VERSION:
            raise MigrationError('Migration 005 already applied (user_version = 5).')
        if version != 4:
            raise MigrationError(f'Expected user_version 4 before migration 005, found {version}; run migrate_004_poi_image_credit.py first.')
        if 'image_credit' not in [row[1] for row in db.execute('PRAGMA table_info(pois)')]:
            raise MigrationError('Migration 004 is missing (pois.image_credit); run migrate_004_poi_image_credit.py first.')
        if db.execute("SELECT 1 FROM sqlite_master WHERE name IN ('admin_audit_log', 'idx_admin_audit_log_created_at')").fetchone():
            raise MigrationError('admin_audit_log already exists; review manually.')
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise MigrationError('Existing foreign-key violation; review before migrating.')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise MigrationError('Database integrity check failed.')
        for sql in statements():
            db.execute(sql)
        if db.execute('PRAGMA user_version').fetchone()[0] != TARGET_VERSION:
            raise MigrationError('Migration did not set user_version 5.')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise MigrationError('Database integrity check failed after migration.')
        db.commit()
    except (sqlite3.Error, MigrationError) as exc:
        db.rollback()
        raise MigrationError(f'Migration 005 stopped; changes rolled back: {exc}') from exc


def migrate(database, *, check_only=False, backup=None):
    database = Path(database).resolve()
    mode = 'ro' if check_only else 'rw'
    with closing(sqlite3.connect(database.as_uri() + f'?mode={mode}', uri=True)) as source:
        if check_only:
            with closing(sqlite3.connect(':memory:')) as snapshot:
                source.backup(snapshot)
                upgrade_connection(snapshot)
            return
        if backup is None:
            raise MigrationError('Applying requires a new --backup path.')
        backup = Path(backup).resolve()
        with backup.open('xb'):
            pass
        with closing(sqlite3.connect(backup)) as target:
            source.backup(target)
        upgrade_connection(source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    if args.check and args.backup:
        parser.error('--backup cannot be combined with --check')
    try:
        migrate(args.database, check_only=args.check, backup=args.backup)
    except (sqlite3.Error, OSError, MigrationError) as exc:
        parser.exit(1, f'{exc}\n')
    print('Migration 005 check passed; source unchanged.' if args.check else
          'Migration 005 applied (user_version = 5); backup preserved.')


if __name__ == '__main__':
    main()
