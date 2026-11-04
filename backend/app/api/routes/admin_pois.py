"""Authenticated place and narration editing; publishing is deliberately separate."""
import re
import sqlite3
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.dependencies import get_db, require_admin
from app.services.auth import timestamp, utc_now

router = APIRouter(prefix="/api/v1/admin/pois", tags=["admin places"], dependencies=[Depends(require_admin)])


class PlaceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    category_id: str
    name: str = Field(max_length=200)
    address: str = Field(max_length=500)
    latitude: float = Field(ge=-90, le=90, strict=True)
    longitude: float = Field(ge=-180, le=180, strict=True)
    radius_m: int = Field(default=100, ge=20, le=1000, strict=True)
    image_url: str | None = Field(default=None, max_length=2048)

    @field_validator("category_id", "name", "address")
    @classmethod
    def nonempty(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Required")
        return value

    @field_validator("image_url")
    @classmethod
    def image(cls, value):
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not re.match(r"^https?://[^\s/]+", value, re.I) or any(c.isspace() for c in value):
            raise ValueError("Image must be an HTTP(S) URL")
        return value


class NarrationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(max_length=500)
    body: str

    @field_validator("title", "body")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Required")
        return value.strip()


class NarrationCreate(NarrationInput):
    locale: str

    @field_validator("locale")
    @classmethod
    def valid_locale(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})*", value):
            raise ValueError("Invalid locale")
        return value


def place(db, poi_id):
    row = db.execute("SELECT * FROM pois WHERE id=?", (poi_id,)).fetchone()
    if not row:
        raise HTTPException(404, "POI_NOT_FOUND")
    return dict(row)


@router.get("")
def list_places(db: sqlite3.Connection = Depends(get_db)):
    return {"items": [dict(r) for r in db.execute("SELECT * FROM pois ORDER BY name, id")]}


@router.get("/{poi_id}")
def get_place(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    return place(db, poi_id)


def save_place(db, body, poi_id=None):
    now = timestamp(utc_now())
    with db:
        if poi_id:
            place(db, poi_id)
        if not db.execute("SELECT 1 FROM categories WHERE id=?", (body.category_id,)).fetchone():
            raise HTTPException(422, "CATEGORY_NOT_FOUND")
        values = (body.category_id, body.name, body.address, body.latitude, body.longitude, body.radius_m, body.image_url)
        if poi_id:
            db.execute("UPDATE pois SET category_id=?, name=?, address=?, latitude=?, longitude=?, radius_m=?, image_url=?, updated_at=? WHERE id=?", (*values, now, poi_id))
        else:
            poi_id = str(uuid.uuid4())
            db.execute("INSERT INTO pois (category_id,name,address,latitude,longitude,radius_m,image_url,id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'draft',?,?)", (*values, poi_id, now, now))
    return place(db, poi_id)


@router.post("", status_code=201)
def create_place(body: PlaceInput, db: sqlite3.Connection = Depends(get_db)):
    return save_place(db, body)


@router.put("/{poi_id}")
def update_place(poi_id: str, body: PlaceInput, db: sqlite3.Connection = Depends(get_db)):
    return save_place(db, body, poi_id)


@router.delete("/{poi_id}", status_code=204)
def delete_place(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    with db:
        if not db.execute("DELETE FROM pois WHERE id=?", (poi_id,)).rowcount:
            raise HTTPException(404, "POI_NOT_FOUND")
    return Response(status_code=204)


@router.get("/{poi_id}/narrations")
def narrations(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    place(db, poi_id)
    return {"items": [dict(r) for r in db.execute("SELECT * FROM poi_narrations WHERE poi_id=? ORDER BY locale", (poi_id,))]}


@router.post("/{poi_id}/narrations", status_code=201)
def add_narration(poi_id: str, body: NarrationCreate, db: sqlite3.Connection = Depends(get_db)):
    now = timestamp(utc_now())
    try:
        with db:
            place(db, poi_id)
            # Existing databases can contain locale spelling with different case.
            if db.execute("SELECT 1 FROM poi_narrations WHERE poi_id=? AND lower(locale)=?", (poi_id, body.locale)).fetchone():
                raise HTTPException(409, "NARRATION_DUPLICATE")
            narration_id = str(uuid.uuid4())
            db.execute("INSERT INTO poi_narrations VALUES (?,?,?,?,?,?,?)", (narration_id, poi_id, body.locale, body.title, body.body, now, now))
    except sqlite3.IntegrityError as exc:
        if getattr(exc, 'sqlite_errorcode', None) == sqlite3.SQLITE_CONSTRAINT_UNIQUE:
            raise HTTPException(409, "NARRATION_DUPLICATE") from exc
        raise
    return dict(db.execute("SELECT * FROM poi_narrations WHERE id=?", (narration_id,)).fetchone())


@router.put("/{poi_id}/narrations/{narration_id}")
def update_narration(poi_id: str, narration_id: str, body: NarrationInput, db: sqlite3.Connection = Depends(get_db)):
    with db:
        place(db, poi_id)
        if not db.execute("UPDATE poi_narrations SET title=?, body=?, updated_at=? WHERE id=? AND poi_id=?", (body.title, body.body, timestamp(utc_now()), narration_id, poi_id)).rowcount:
            raise HTTPException(404, "NARRATION_NOT_FOUND")
    return dict(db.execute("SELECT * FROM poi_narrations WHERE id=?", (narration_id,)).fetchone())


def publish_problems(db, row):
    """BR04 + BR03: danh sách mục còn thiếu trước khi công bố."""
    problems = []
    if not (row["name"] or "").strip():
        problems.append("name")
    if not (row["address"] or "").strip():
        problems.append("address")
    if not db.execute("SELECT 1 FROM categories WHERE id=?", (row["category_id"],)).fetchone():
        problems.append("category")
    if not (-90 <= row["latitude"] <= 90 and -180 <= row["longitude"] <= 180 and 20 <= row["radius_m"] <= 1000):
        problems.append("coordinates")
    if not db.execute("SELECT 1 FROM poi_narrations WHERE poi_id=? AND length(trim(title))>0 AND length(trim(body))>0", (row["id"],)).fetchone():
        problems.append("narration")
    return problems


def change_status(db, poi_id, allowed_from, new_status):
    with db:
        row = place(db, poi_id)
        if row["status"] not in allowed_from:
            raise HTTPException(409, "INVALID_STATUS_TRANSITION")
        if new_status == "published":
            problems = publish_problems(db, row)
            if problems:
                raise HTTPException(422, {"code": "POI_NOT_PUBLISHABLE", "details": problems})
        db.execute("UPDATE pois SET status=?, updated_at=? WHERE id=?", (new_status, timestamp(utc_now()), poi_id))
    return place(db, poi_id)


@router.post("/{poi_id}/publish")
def publish_place(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    """UC09: Nháp/Ẩn -> Công khai sau khi kiểm tra BR04 và có >= 1 bài hợp lệ."""
    return change_status(db, poi_id, ("draft", "hidden"), "published")


@router.post("/{poi_id}/hide")
def hide_place(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    """UC09-A1: Công khai -> Ẩn; địa điểm biến mất khỏi API khách."""
    return change_status(db, poi_id, ("published",), "hidden")
