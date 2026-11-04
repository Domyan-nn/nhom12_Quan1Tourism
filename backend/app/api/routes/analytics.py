"""Route thống kê ẩn danh dành cho khách (không cần đăng nhập).

POST /api/v1/analytics/heartbeat -> 204 | 409
POST /api/v1/analytics/revoke    -> 204 (idempotent)
Giữ /api/analytics/** cho client cũ. Mỗi request dùng kết nối riêng.
"""
import sqlite3
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db import connection as connection_module
from app.schemas.analytics import SessionPayload
from app.services import analytics_service as svc

router = APIRouter(prefix="/api/analytics", tags=["analytics"])  # đường dẫn client hiện tại
v1_router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def get_connection() -> Iterator[sqlite3.Connection]:
    """Kết nối theo request tới database đang cấu hình (SAIGON_DATABASE).

    Service tự mở giao dịch BEGIN IMMEDIATE nên cần isolation_level=None và busy_timeout.
    Test có thể ghi đè bằng dependency_overrides.
    """
    conn = connection_module.connect(connection_module.configured_database())
    conn.isolation_level = None
    conn.execute("PRAGMA busy_timeout = 10000")
    try:
        yield conn
    finally:
        conn.close()


@v1_router.post("/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
def heartbeat(payload: SessionPayload, conn: sqlite3.Connection = Depends(get_connection)) -> Response:
    result = svc.record_heartbeat(conn, payload.session_id)
    if result["status"] == "revoked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_revoked")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@v1_router.post("/revoke", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke(payload: SessionPayload, conn: sqlite3.Connection = Depends(get_connection)) -> Response:
    svc.revoke_session(conn, payload.session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
