"""SQL for the Admin audit log (migration 005)."""

import sqlite3


def insert_entry(db: sqlite3.Connection, entry_id: str, admin_id: str, action: str, target_type: str | None,
                 target_id: str | None, summary: str | None, created_at: str) -> None:
    db.execute(
        "INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (entry_id, admin_id, action, target_type, target_id, summary, created_at),
    )


def list_entries(db: sqlite3.Connection, limit: int):
    # created_at has one-second resolution; rowid keeps entries of the same second in insertion order.
    return db.execute(
        "SELECT l.id, l.admin_id, a.username AS admin_username, l.action, l.target_type, l.target_id, l.summary, l.created_at "
        "FROM admin_audit_log l JOIN admin_accounts a ON a.id = l.admin_id "
        "ORDER BY l.created_at DESC, l.rowid DESC LIMIT ?",
        (limit,),
    ).fetchall()
