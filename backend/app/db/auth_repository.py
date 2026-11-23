"""SQL for Admin accounts and sessions."""

import sqlite3


def find_account(db: sqlite3.Connection, username: str):
    return db.execute("SELECT id, username, password_hash, is_active, updated_at FROM admin_accounts WHERE username = ?", (username,)).fetchone()


def create_session(db: sqlite3.Connection, session_id: str, admin_id: str, token_digest: str, issued: str, expires: str) -> None:
    db.execute("INSERT INTO admin_sessions (id, admin_id, token_hash, issued_at, expires_at) VALUES (?, ?, ?, ?, ?)",
               (session_id, admin_id, token_digest, issued, expires))


def find_session(db: sqlite3.Connection, token_digest: str):
    return db.execute(
        "SELECT s.id, s.issued_at, s.expires_at, s.revoked_at, a.id AS admin_id, a.username, a.is_active, a.password_hash, a.updated_at "
        "FROM admin_sessions s JOIN admin_accounts a ON a.id = s.admin_id WHERE s.token_hash = ?",
        (token_digest,),
    ).fetchone()


def update_password(db: sqlite3.Connection, admin_id: str, digest: str, changed: str) -> None:
    # updated_at của admin_accounts chỉ đổi khi đổi mật khẩu, nên dùng làm mốc "lần đổi mật khẩu gần nhất".
    db.execute("UPDATE admin_accounts SET password_hash = ?, updated_at = ? WHERE id = ?", (digest, changed, admin_id))


def revoke_session(db: sqlite3.Connection, session_id: str, revoked: str) -> None:
    db.execute("UPDATE admin_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL", (revoked, session_id))


def delete_sessions_expired_before(db: sqlite3.Connection, cutoff: str) -> int:
    # expires_at is always written by services.auth.timestamp(), so text order is time order.
    return db.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (cutoff,)).rowcount
