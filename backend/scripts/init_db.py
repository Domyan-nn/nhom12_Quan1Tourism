"""Initialize the SQLite schema in a database without existing tables or views."""

import argparse
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from scripts.migrate_db import upgrade_connection
from scripts.prepare_category_bilingual import upgrade_connection as upgrade_categories

DEFAULT_DATABASE = BACKEND_DIR / "data" / "saigon_stories.db"
MIGRATION = BACKEND_DIR / "migrations" / "001_initial.sql"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    args = parser.parse_args()
    database = args.database.resolve()
    database.parent.mkdir(parents=True, exist_ok=True)

    with closing(sqlite3.connect(database)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        existing = connection.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') "
            "AND name NOT LIKE 'sqlite_%' LIMIT 1"
        ).fetchone()
        if existing:
            raise SystemExit(
                f"Database already contains a table or view ({existing[0]}). "
                "Use a new database or an appropriate migration; no changes were made."
            )
        try:
            connection.executescript(MIGRATION.read_text(encoding="utf-8"))
            upgrade_connection(connection)
            upgrade_categories(connection)
        except sqlite3.Error:
            connection.rollback()
            raise
    print(f"Database initialized: {database}")


if __name__ == "__main__":
    main()
