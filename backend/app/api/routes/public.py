"""Public read-only catalog endpoints."""

import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_db
from app.db import poi_repository
from app.services import categories

router = APIRouter(prefix="/api/v1", tags=["public catalog"])


@router.get("/categories")
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    return {"items": categories.list_categories(db)}


@router.get("/pois")
def list_pois(q: str = "", category_id: str | None = None, db: sqlite3.Connection = Depends(get_db)):
    return {"items": poi_repository.list_pois(db, q, category_id)}


@router.get("/pois/{poi_id}")
def get_poi(poi_id: str, db: sqlite3.Connection = Depends(get_db)):
    item = poi_repository.get_poi(db, poi_id)
    if item is None:
        raise HTTPException(status_code=404, detail="POI_NOT_FOUND")
    return item
