import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.dependencies import get_db, require_admin
from app.schemas.category import CategoryInput
from app.services import categories

router = APIRouter(prefix="/api/v1/admin/categories", tags=["admin categories"], dependencies=[Depends(require_admin)])


@router.get("")
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    return {"items": categories.list_categories(db)}


@router.post("", status_code=201)
def create_category(body: CategoryInput, db: sqlite3.Connection = Depends(get_db)):
    try:
        return categories.create_category(db, body.name, body.name_en)
    except categories.CategoryDuplicate:
        raise HTTPException(status_code=409, detail="CATEGORY_DUPLICATE")


@router.patch("/{category_id}")
def update_category(category_id: str, body: CategoryInput, db: sqlite3.Connection = Depends(get_db)):
    try:
        return categories.update_category(db, category_id, body.name, body.name_en)
    except categories.CategoryNotFound:
        raise HTTPException(status_code=404, detail="CATEGORY_NOT_FOUND")
    except categories.CategoryDuplicate:
        raise HTTPException(status_code=409, detail="CATEGORY_DUPLICATE")


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        categories.delete_category(db, category_id)
    except categories.CategoryNotFound:
        raise HTTPException(status_code=404, detail="CATEGORY_NOT_FOUND")
    except categories.CategoryInUse:
        raise HTTPException(status_code=409, detail="CATEGORY_IN_USE")
    return Response(status_code=204)
