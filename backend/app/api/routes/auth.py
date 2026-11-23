import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.dependencies import get_db, require_admin_session
from app.schemas.auth import ChangePasswordRequest, LoginRequest
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
def me(session=Depends(require_admin_session)):
    return {"id": session["admin_id"], "username": session["username"], "password_expired": auth.password_expired(session["updated_at"])}


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordRequest, session=Depends(require_admin_session), db: sqlite3.Connection = Depends(get_db)):
    error = auth.change_password(db, session, body.current_password, body.new_password)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return Response(status_code=204)


@router.post("/logout", status_code=204)
def logout(session=Depends(require_admin_session), db: sqlite3.Connection = Depends(get_db)):
    auth.logout(db, session["id"], session["admin_id"])
    return Response(status_code=204)
