"""Read-only Admin audit log (extension C). Entries are written by the routes they describe."""

import sqlite3

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_db, require_admin
from app.services import audit

router = APIRouter(prefix="/api/v1/admin/audit-log", tags=["admin audit log"], dependencies=[Depends(require_admin)])


@router.get("")
def audit_log(limit: int = Query(default=audit.DEFAULT_LIMIT, ge=1, le=audit.MAX_LIMIT), db: sqlite3.Connection = Depends(get_db)):
    """Newest first. Requires an Admin session; 422 when limit is outside 1..200."""
    return {"items": audit.list_entries(db, limit), "limit": limit}
