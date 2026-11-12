import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.dependencies import get_db, require_admin
from app.schemas.auth import LoginRequest
from app.services import auth

router = APIRouter(prefix="/api/v1/admin", tags=["admin authentication"])


@router.post("/login")
def login(body: LoginRequest, response: Response, db: sqlite3.Connection = Depends(get_db)):
    try:
        result = auth.login(db, body.username, body.password)
    except auth.LoginThrottled as exc:
        raise HTTPException(status_code=429, detail="TOO_MANY_ATTEMPTS", headers={"Retry-After": str(exc.retry_after)})
    if result is None:
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")
    response.headers["Cache-Control"] = "no-store"
    return result


@router.get("/me")
def me(session=Depends(require_admin)):
    return {"id": session["admin_id"], "username": session["username"]}


@router.post("/logout", status_code=204)
def logout(session=Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    auth.logout(db, session["id"], session["admin_id"])
    return Response(status_code=204)
