"""Small SQLite connection helper for scripts and future FastAPI dependencies."""

import sqlite3
from pathlib import Path
from typing import Iterator, Union

DEFAULT_DATABASE = Path(__file__).resolve().parents[2] / "data" / "saigon_stories.db"


def connect(database: Union[str, Path] = DEFAULT_DATABASE) -> sqlite3.Connection:
    """Open an existing database and enable foreign keys on this connection."""
    uri = Path(database).resolve().as_uri() + "?mode=rw"
    # FastAPI may run a sync dependency and route in different worker threads.
    # Each request must still use its own connection, never concurrently.
    connection = sqlite3.connect(uri, uri=True, check_same_thread=False)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        if connection.execute("PRAGMA foreign_keys").fetchone()[0] != 1:
            raise RuntimeError("Could not enable SQLite foreign keys")
        connection.row_factory = sqlite3.Row
        return connection
    except Exception:
        connection.close()
        raise


def get_connection() -> Iterator[sqlite3.Connection]:
    """Yield a per-request connection; suitable for a sync FastAPI dependency."""
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()
