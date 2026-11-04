"""UC10/UC11: thống kê dành cho Admin (cần phiên hợp lệ, BR09)."""
import sqlite3
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_db, require_admin
from app.services import analytics_service as svc

router = APIRouter(prefix="/api/v1/admin/stats", tags=["admin stats"], dependencies=[Depends(require_admin)])


@router.get("/visits")
def visits(date_from: str | None = None, date_to: str | None = None, db: sqlite3.Connection = Depends(get_db)):
    start = end = None
    if date_from is not None or date_to is not None:
        try:
            start, end = date.fromisoformat(date_from or ""), date.fromisoformat(date_to or "")
        except ValueError:
            raise HTTPException(422, "INVALID_DATE_RANGE")
        if not svc.valid_range(start, end):
            raise HTTPException(422, "INVALID_DATE_RANGE")
    return svc.visit_stats(db, start, end)


@router.get("/active")
def active(db: sqlite3.Connection = Depends(get_db)):
    return svc.active_snapshot(db)
