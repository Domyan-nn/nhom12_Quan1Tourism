"""Small SQLite connection helper for scripts and future FastAPI dependencies."""

import sqlite3
import os
from pathlib import Path
from typing import Iterator, Union

DEFAULT_DATABASE = Path(__file__).resolve().parents[2] / "data" / "saigon_stories.db"


def configured_database() -> Path:
    return Path(os.environ.get("SAIGON_DATABASE") or DEFAULT_DATABASE).resolve()


def validate_category_schema(database: Path) -> None:
    """Check the selected database without creating or modifying it."""
    database = Path(database).resolve()
    try:
        connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
        try:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(categories)")}
        finally:
            connection.close()
    except sqlite3.Error as exc:
        raise RuntimeError(f"Không thể mở database {database}. Kiểm tra SAIGON_DATABASE và đường dẫn tệp.") from exc
    required = {"id", "name", "normalized_name", "name_en", "normalized_name_en", "created_at", "updated_at"}
    missing = required - columns
    if missing:
        raise RuntimeError(
            f"Database {database} thiếu bảng categories hoặc các cột: {', '.join(sorted(missing))}. "
            "Dùng database demo đã nâng cấp hoặc sao lưu và nâng cấp database theo backend/README.md."
        )


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
