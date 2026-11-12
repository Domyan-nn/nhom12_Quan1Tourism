"""Admin audit log (extension C).

`record` only INSERTs and never commits: call it inside the same `with db:` block as the change it
describes, after the change succeeded. The entry and the change are then committed or rolled back
together, so a rejected request (401/404/409/422) leaves no entry and an accepted one cannot lose it.
Passwords, tokens and narration text are never logged; `summary` is only a short label (place or
category name, narration language).
"""

import re
import sqlite3
import uuid
from datetime import datetime, timezone

from app.db import audit_repository as repository

ACTIONS = frozenset({
    "auth.login", "auth.logout",
    "category.create", "category.update", "category.delete",
    "poi.create", "poi.update", "poi.delete", "poi.publish", "poi.hide", "poi.image_upload", "poi.image_delete",
    "narration.create", "narration.update", "narration.delete",
})
SUMMARY_MAX = 200
DEFAULT_LIMIT = 50
MAX_LIMIT = 200

_CONTROL = re.compile(r"[\x00-\x1f\x7f]+")


def clean_summary(value: str | None) -> str | None:
    """One line, no control characters, at most SUMMARY_MAX characters; empty becomes None."""
    if value is None:
        return None
    text = " ".join(_CONTROL.sub(" ", str(value)).split())
    if len(text) > SUMMARY_MAX:
        text = text[: SUMMARY_MAX - 1] + "…"
    return text or None


def record(db: sqlite3.Connection, admin_id: str, action: str, target_type: str | None = None,
           target_id: str | None = None, summary: str | None = None) -> str:
    """Add one entry inside the caller's transaction and return its id."""
    if action not in ACTIONS:
        raise ValueError(f"Unknown audit action: {action}")
    entry_id = str(uuid.uuid4())
    created = datetime.now(timezone.utc).isoformat(timespec="seconds")
    repository.insert_entry(db, entry_id, admin_id, action, target_type, target_id, clean_summary(summary), created)
    return entry_id


def list_entries(db: sqlite3.Connection, limit: int = DEFAULT_LIMIT):
    """Newest first; `limit` is clamped to 1..MAX_LIMIT."""
    limit = max(1, min(int(limit), MAX_LIMIT))
    return [dict(row) for row in repository.list_entries(db, limit)]
