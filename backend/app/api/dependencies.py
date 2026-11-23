"""Request-scoped database connection and Admin authentication."""

import sqlite3
from typing import Iterator

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.connection import configured_database, connect
from app.services import auth

bearer = HTTPBearer(auto_error=False)


def get_db() -> Iterator[sqlite3.Connection]:
    db = connect(configured_database())
    try:
        yield db
    finally:
        db.close()


def require_admin_session(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: sqlite3.Connection = Depends(get_db)):
    """Phiên hợp lệ, kể cả khi mật khẩu đã hết hạn (chỉ dùng cho me/logout/change-password)."""
    session = auth.current_session(db, credentials.credentials) if credentials else None
    if session is None:
        raise HTTPException(status_code=401, detail="AUTH_REQUIRED", headers={"WWW-Authenticate": "Bearer"})
    return session


def require_admin(session=Depends(require_admin_session)):
    if auth.password_expired(session["updated_at"]):
        raise HTTPException(status_code=403, detail="PASSWORD_EXPIRED")
    return session
