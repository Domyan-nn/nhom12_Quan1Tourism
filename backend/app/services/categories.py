"""Category rules and transactions."""

import sqlite3
import uuid

from app.db import category_repository as repository
from app.services.auth import timestamp, utc_now


class CategoryNotFound(Exception):
    pass


class CategoryInUse(Exception):
    pass


class CategoryDuplicate(Exception):
    pass


def list_categories(db: sqlite3.Connection):
    return [dict(row) for row in repository.list_categories(db)]


def create_category(db: sqlite3.Connection, name: str, name_en: str):
    category_id = str(uuid.uuid4())
    try:
        with db:
            repository.insert_category(db, category_id, name, name_en, timestamp(utc_now()))
    except sqlite3.IntegrityError as exc:
        if getattr(exc, "sqlite_errorcode", None) == sqlite3.SQLITE_CONSTRAINT_UNIQUE:
            raise CategoryDuplicate from exc
        raise
    return {"id": category_id, "name": name, "name_en": name_en}


def update_category(db: sqlite3.Connection, category_id: str, name: str, name_en: str):
    try:
        with db:
            count = repository.update_category(db, category_id, name, name_en, timestamp(utc_now()))
            if not count:
                raise CategoryNotFound
    except sqlite3.IntegrityError as exc:
        if getattr(exc, "sqlite_errorcode", None) == sqlite3.SQLITE_CONSTRAINT_UNIQUE:
            raise CategoryDuplicate from exc
        raise
    return {"id": category_id, "name": name, "name_en": name_en}


def delete_category(db: sqlite3.Connection, category_id: str) -> None:
    # Lock writers while checking references and deleting to prevent a race.
    try:
        db.execute("BEGIN IMMEDIATE")
        if repository.find_category(db, category_id) is None:
            raise CategoryNotFound
        if repository.category_in_use(db, category_id):
            raise CategoryInUse
        repository.delete_category(db, category_id)
        db.commit()
    except Exception:
        db.rollback()
        raise
