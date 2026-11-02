"""Add bilingual category columns to an existing database.

Stop all database writers before running. A new backup is mandatory when applying.
No translations are inferred. The existing name remains the Vietnamese name.
"""

import argparse
import sqlite3
from contextlib import closing
from pathlib import Path


class MigrationError(ValueError):
    pass


def upgrade_connection(db):
    if db.in_transaction:
        raise MigrationError('An active transaction is not supported.')
    try:
        db.execute('PRAGMA foreign_keys = ON')
        db.execute('BEGIN IMMEDIATE')
        columns = [row[1] for row in db.execute('PRAGMA table_info(categories)')]
        if columns != ['id', 'name', 'normalized_name', 'created_at', 'updated_at']:
            raise MigrationError('Unexpected category schema or migration already applied.')
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise MigrationError('Existing foreign-key violation; review before migrating.')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise MigrationError('Database integrity check failed.')
        db.execute("ALTER TABLE categories ADD COLUMN name_en TEXT CHECK (name_en IS NULL OR length(trim(name_en)) > 0)")
        db.execute("ALTER TABLE categories ADD COLUMN normalized_name_en TEXT CHECK (normalized_name_en IS NULL OR length(trim(normalized_name_en)) > 0)")
        db.execute('CREATE UNIQUE INDEX idx_categories_normalized_name_en ON categories(normalized_name_en) WHERE normalized_name_en IS NOT NULL')
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise MigrationError('Foreign-key validation failed.')
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise MigrationError('Database integrity check failed after migration.')
        db.commit()
    except (sqlite3.Error, MigrationError) as exc:
        db.rollback()
        raise MigrationError(f'Category migration stopped; changes rolled back: {exc}') from exc


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
    print('Category migration check passed; source unchanged.' if args.check else
          'Category columns prepared; backup preserved. English names remain empty.')


if __name__ == '__main__':
    main()
