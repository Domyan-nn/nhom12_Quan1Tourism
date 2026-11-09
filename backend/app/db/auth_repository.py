"""SQL for Admin accounts and sessions."""

import sqlite3


def find_account(db: sqlite3.Connection, username: str):
    return db.execute("SELECT id, username, password_hash, is_active FROM admin_accounts WHERE username = ?", (username,)).fetchone()


def create_session(db: sqlite3.Connection, session_id: str, admin_id: str, token_digest: str, issued: str, expires: str) -> None:
    db.execute("INSERT INTO admin_sessions (id, admin_id, token_hash, issued_at, expires_at) VALUES (?, ?, ?, ?, ?)",
               (session_id, admin_id, token_digest, issued, expires))


def find_session(db: sqlite3.Connection, token_digest: str):
    return db.execute(
        "SELECT s.id, s.issued_at, s.expires_at, s.revoked_at, a.id AS admin_id, a.username, a.is_active "
        "FROM admin_sessions s JOIN admin_accounts a ON a.id = s.admin_id WHERE s.token_hash = ?",
        (token_digest,),
    ).fetchone()


def revoke_session(db: sqlite3.Connection, session_id: str, revoked: str) -> None:
    db.execute("UPDATE admin_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL", (revoked, session_id))


def delete_sessions_expired_before(db: sqlite3.Connection, cutoff: str) -> int:
    # expires_at is always written by services.auth.timestamp(), so text order is time order.
    return db.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (cutoff,)).rowcount
