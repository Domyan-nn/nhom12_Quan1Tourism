"""Validate or upgrade analytics tables; never create a missing database.

Stop API/writers first. --check tests on an in-memory snapshot only.
Applying requires an unused --backup path; failures roll back the transaction.
"""

import argparse
import re
import sqlite3
from contextlib import closing
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[1] / 'migrations' / '002_analytics_constraints.sql'
TABLES = {
    'anonymous_sessions': ['session_id', 'consent_granted', 'created_at', 'last_seen_at'],
    'visit_events': ['id', 'session_id', 'started_at'],
}
KNOWN_INDEXES = {
    'idx_anonymous_sessions_last_seen_at', 'idx_anonymous_sessions_last_seen',
    'idx_visit_events_session_id', 'idx_visit_events_session', 'idx_visit_events_started_at',
}


class MigrationError(ValueError):
    pass


def statements():
    pending = ''
    for line in MIGRATION.read_text(encoding='utf-8').splitlines():
        pending += line + '\n'
        if sqlite3.complete_statement(pending):
            yield pending
            pending = ''
    if pending.strip():
        raise MigrationError('Incomplete migration SQL')


def check_schema(db):
    if db.execute('PRAGMA user_version').fetchone()[0] not in (0, 2):
        raise MigrationError('Unknown schema version; review manually before upgrading.')
    for table, columns in TABLES.items():
        info = db.execute(f'PRAGMA table_info({table})').fetchall()
        actual = [r[1] for r in info]
        if actual != columns:
            raise MigrationError(f'Unexpected columns in {table}; no automatic upgrade available.')
        expected_types = ['TEXT', 'INTEGER', 'TEXT', 'TEXT'] if table == 'anonymous_sessions' else ['TEXT'] * 3
        if [r[2].upper() for r in info] != expected_types or [r[5] for r in info] != [1] + [0] * (len(info) - 1):
            raise MigrationError(f'Unexpected column types or primary key in {table}; review manually.')
    for kind, name, table, sql in db.execute(
        "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL"
    ):
        if kind == 'index' and table in TABLES and name not in KNOWN_INDEXES:
            raise MigrationError(f'Custom index {name} requires manual migration.')
        if kind in ('trigger', 'view') and re.search(r'\b(anonymous_sessions|visit_events)\b', sql, re.I):
            raise MigrationError(f'Dependent {kind} {name} requires manual migration.')
        if kind == 'table' and name not in TABLES:
            quoted = name.replace('"', '""')
            if any(r[2] in TABLES for r in db.execute(f'PRAGMA foreign_key_list("{quoted}")')):
                raise MigrationError(f'Table {name} references analytics; review manually.')
    if db.execute('PRAGMA foreign_key_check').fetchone():
        raise MigrationError('Existing foreign key violations; fix explicitly before upgrading.')


def upgrade_connection(db):
    """Rebuild the two analytics tables atomically, preserving every valid row."""
    if db.in_transaction:
        raise MigrationError('Migration requires a connection without an active transaction.')
    db.execute('PRAGMA foreign_keys = OFF')
    db.execute('PRAGMA ignore_check_constraints = OFF')
    try:
        db.execute('BEGIN IMMEDIATE')
        check_schema(db)
        for sql in statements():
            db.execute(sql)
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise MigrationError('Foreign key validation failed; no changes saved.')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise MigrationError('Integrity validation failed; no changes saved.')
        db.commit()
    except (sqlite3.Error, MigrationError) as exc:
        db.rollback()
        raise MigrationError(f'Analytics upgrade stopped; no changes saved: {exc}') from exc
    finally:
        db.execute('PRAGMA foreign_keys = ON')


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
            raise MigrationError('Applying requires --backup pointing to a new file.')
        backup = Path(backup).resolve()
        # Exclusive creation prevents overwriting the database, existing backups or symlinks.
        with backup.open('xb'):
            pass
        with closing(sqlite3.connect(backup)) as target:
            source.backup(target)
        upgrade_connection(source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--check', action='store_true', help='Validate an in-memory snapshot only')
    parser.add_argument('--backup', type=Path, help='Required when applying; must not exist')
    args = parser.parse_args()
    try:
        migrate(args.database, check_only=args.check, backup=args.backup)
    except (sqlite3.Error, OSError, MigrationError) as exc:
        parser.exit(1, f'{exc}\n')
    print('Analytics upgrade check passed; source unchanged.' if args.check else 'Analytics schema upgraded to version 2; backup preserved.')


if __name__ == '__main__':
    main()
