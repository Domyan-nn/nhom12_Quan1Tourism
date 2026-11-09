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
            "Sao lưu và nâng cấp database chính theo RUNNING.md."
        )


def validate_analytics_schema(database: Path) -> None:
    """Refuse unmigrated analytics before any startup retention writes."""
    connection = sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True)
    try:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        required = {
            'anonymous_sessions': {'session_id', 'consent_granted', 'created_at', 'last_seen_at'},
            'visit_events': {'id', 'session_id', 'started_at'},
        }
        valid = version >= 2 and all(
            columns <= {row[1] for row in connection.execute(f'PRAGMA table_info({table})')}
            for table, columns in required.items()
        )
    finally:
        connection.close()
    if not valid:
        raise RuntimeError(
            f"Database {database} chưa có schema analytics phiên bản 2. "
            "Sao lưu và kiểm tra bằng backend/scripts/migrate_db.py theo RUNNING.md; API không tự migration."
        )


def validate_schema_version(database: Path) -> None:
    """Schema 4 (migration 004) adds pois.image_credit; refuse older databases without changing them."""
    connection = sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True)
    try:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        has_credit = "image_credit" in {row[1] for row in connection.execute("PRAGMA table_info(pois)")}
    finally:
        connection.close()
    if version < 4 or not has_credit:
        raise RuntimeError(
            f"Database {database} chưa có migration 004 (pois.image_credit, user_version 4). "
            "Sao lưu rồi chạy backend/scripts/migrate_004_poi_image_credit.py theo RUNNING.md; API không tự migration."
        )


def connect(database: Union[str, Path] = DEFAULT_DATABASE) -> sqlite3.Connection:
    """Open an existing database and enable foreign keys on this connection."""
    uri = Path(database).resolve().as_uri() + "?mode=rw"
    # FastAPI may run a sync dependency and route in different worker threads.
    # Each request must still use its own connection, never concurrently.
    connection = sqlite3.connect(uri, uri=True, check_same_thread=False, timeout=10)
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
