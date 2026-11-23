"""Admin login and session lifecycle."""

import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from app.core import security
from app.db import auth_repository as repository
from app.services import audit
from app.services.login_throttle import LoginThrottle

SESSION_HOURS = 8
# Phiên hết hạn quá lâu chỉ làm bảng admin_sessions phình ra; xóa khi có lần đăng nhập mới.
STALE_SESSION_DAYS = 7
# Mật khẩu quá 1 ngày chưa đổi thì Admin phải đổi trước khi dùng các chức năng quản trị khác.
PASSWORD_MAX_AGE = timedelta(days=1)
throttle = LoginThrottle()


class LoginThrottled(Exception):
    def __init__(self, retry_after: int):
        super().__init__(retry_after)
        self.retry_after = retry_after


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def timestamp(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def password_expired(changed_at, now: datetime | None = None) -> bool:
    try:
        changed = datetime.fromisoformat(changed_at)
    except (ValueError, TypeError):
        return True  # Không đọc được mốc đổi mật khẩu: coi như đã hết hạn.
    if changed.tzinfo is None:
        return True
    return (now or utc_now()) - changed >= PASSWORD_MAX_AGE


def login(db: sqlite3.Connection, username: str, password: str):
    key = security.normalize_username(username)
    now = utc_now()
    wait = throttle.retry_after(key, now)
    if wait:
        # Không kiểm tra mật khẩu khi đang bị khóa tạm: lần đoán này không được tính là đúng hay sai.
        raise LoginThrottled(wait)
    account = repository.find_account(db, key)
    valid = security.verify_password(password, account["password_hash"]) if account else False
    if not account:
        security.consume_password_work(password)
    if not account or not account["is_active"] or not valid:
        throttle.record_failure(key, now)
        return None
    throttle.reset(key)
    token = security.new_token()
    expires = now + timedelta(hours=SESSION_HOURS)
    with db:
        repository.create_session(db, str(uuid.uuid4()), account["id"], security.token_hash(token), timestamp(now), timestamp(expires))
        repository.delete_sessions_expired_before(db, timestamp(now - timedelta(days=STALE_SESSION_DAYS)))
        audit.record(db, account["id"], "auth.login", "admin", account["id"])  # only a successful login is logged
    return {"access_token": token, "expires_at": timestamp(expires), "password_expired": password_expired(account["updated_at"], now)}


def current_session(db: sqlite3.Connection, token: str):
    session = repository.find_session(db, security.token_hash(token))
    if not session or not session["is_active"] or session["revoked_at"] is not None:
        return None
    try:
        issued = datetime.fromisoformat(session["issued_at"])
        expires = datetime.fromisoformat(session["expires_at"])
        if issued.tzinfo is None or expires.tzinfo is None or not issued <= utc_now() < expires:
            return None
    except (ValueError, TypeError, OverflowError):
        return None
    return session


def change_password(db: sqlite3.Connection, session, current_password: str, new_password: str) -> str | None:
    """Trả về mã lỗi, hoặc None nếu đổi thành công."""
    if not security.verify_password(current_password, session["password_hash"]):
        return "INVALID_CURRENT_PASSWORD"
    if new_password == current_password:
        return "PASSWORD_REUSED"
    now = timestamp(utc_now())
    with db:
        repository.update_password(db, session["admin_id"], security.hash_password(new_password), now)
        audit.record(db, session["admin_id"], "auth.password_change", "admin", session["admin_id"])
    return None


def logout(db: sqlite3.Connection, session_id: str, admin_id: str) -> None:
    with db:
        repository.revoke_session(db, session_id, timestamp(utc_now()))
        audit.record(db, admin_id, "auth.logout", "admin", admin_id)
