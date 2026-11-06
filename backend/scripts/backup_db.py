"""Copy an existing SQLite database to a NEW file and validate the snapshot.

Also use this command to rehearse restoration into a new temporary database.
The source is opened read-only. No initialization, seed or migration is run.
"""

import argparse
import sqlite3
import time
from contextlib import closing
from pathlib import Path


def backup_database(database: Path, destination: Path) -> None:
    database = Path(database).resolve()
    # Preserve the final path component so exclusive creation also refuses dangling symlinks.
    destination = Path(destination).absolute()
    with closing(sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)) as source:
        if not source.execute("SELECT 1 FROM sqlite_master WHERE type='table' LIMIT 1").fetchone():
            raise ValueError("Source has no tables; check the selected database.")
        # Never overwrite a database, backup, or existing symbolic link.
        with destination.open("xb"):
            pass
        deadline = time.monotonic() + 30

        def progress(status, remaining, total):
            if time.monotonic() > deadline:
                raise TimeoutError("Backup timed out; stop writers and retry with a new destination.")

        with closing(sqlite3.connect(destination)) as target:
            source.backup(target, pages=256, progress=progress)
            if target.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
                raise ValueError("Snapshot integrity check failed; do not use this destination.")
            if target.execute("PRAGMA foreign_key_check").fetchone():
                raise ValueError("Snapshot has foreign key violations; do not use this destination.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True, help="New file in an existing directory")
    args = parser.parse_args()
    try:
        backup_database(args.database, args.destination)
    except (sqlite3.Error, OSError, ValueError) as exc:
        parser.exit(1, f"Backup failed: {exc}\nAn incomplete destination may remain; do not use it.\n")
    print("Snapshot created; integrity_check and foreign_key_check passed. Source unchanged.")


if __name__ == "__main__":
    main()
