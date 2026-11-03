"""Route thống kê ẩn danh dành cho khách (không cần đăng nhập).

POST /api/analytics/heartbeat  -> 204 | 409 {"detail": "session_revoked"}
POST /api/analytics/revoke     -> 204 (idempotent)

TODO khi ghép vào app: thay `get_conn` bằng hàm mở kết nối trong
app/db/connection.py (cần foreign_keys=ON, isolation_level=None, busy_timeout),
rồi `app.include_router(analytics.router)` trong main.
"""
import sqlite3
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.schemas.analytics import SessionPayload
from app.services import analytics_service as svc

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def get_connection() -> Iterator[sqlite3.Connection]:  # pragma: no cover - thay bằng connection.py
    raise NotImplementedError("Nối với app/db/connection.py")


@router.post("/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
def heartbeat(payload: SessionPayload, conn: sqlite3.Connection = Depends(get_connection)) -> Response:
    result = svc.record_heartbeat(conn, payload.session_id)
    if result["status"] == "revoked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="session_revoked")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke(payload: SessionPayload, conn: sqlite3.Connection = Depends(get_connection)) -> Response:
    svc.revoke_session(conn, payload.session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
