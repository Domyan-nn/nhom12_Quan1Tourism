"""SQL operations for categories."""

import sqlite3


def list_categories(db: sqlite3.Connection):
    return db.execute("SELECT id, name, name_en FROM categories ORDER BY normalized_name, id").fetchall()


def find_category(db: sqlite3.Connection, category_id: str):
    return db.execute("SELECT id, name, name_en FROM categories WHERE id = ?", (category_id,)).fetchone()


def insert_category(db: sqlite3.Connection, category_id: str, name: str, name_en: str, now: str) -> None:
    db.execute("INSERT INTO categories (id, name, normalized_name, name_en, normalized_name_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
               (category_id, name, name.casefold(), name_en, name_en.casefold(), now, now))


def update_category(db: sqlite3.Connection, category_id: str, name: str, name_en: str, now: str) -> int:
    return db.execute("UPDATE categories SET name = ?, normalized_name = ?, name_en = ?, normalized_name_en = ?, updated_at = ? WHERE id = ?",
                      (name, name.casefold(), name_en, name_en.casefold(), now, category_id)).rowcount


def category_in_use(db: sqlite3.Connection, category_id: str) -> bool:
    return db.execute("SELECT 1 FROM pois WHERE category_id = ? LIMIT 1", (category_id,)).fetchone() is not None


def delete_category(db: sqlite3.Connection, category_id: str) -> None:
    db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
