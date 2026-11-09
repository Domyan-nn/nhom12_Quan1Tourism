"""Read published places without exposing draft or hidden records."""

import sqlite3

from app.core.text import search_key


def list_pois(db: sqlite3.Connection, query: str = "", category_id: str | None = None):
    sql = "SELECT id, name, category_id, address, latitude, longitude, radius_m, image_url, image_credit FROM pois WHERE status = 'published'"
    params = []
    if category_id is not None:
        sql += " AND category_id = ?"
        params.append(category_id)
    rows = db.execute(sql + " ORDER BY name, id", params).fetchall()
    needle = search_key(query)
    items = []
    for row in rows:
        if needle and needle not in search_key(row["name"]):
            continue
        item = dict(row)
        item["narration_locales"] = [r[0] for r in db.execute(
            "SELECT locale FROM poi_narrations WHERE poi_id = ? AND length(trim(title)) > 0 AND length(trim(body)) > 0 ORDER BY locale", (row["id"],))]
        items.append(item)
    return items


def get_poi(db: sqlite3.Connection, poi_id: str):
    row = db.execute("SELECT id, name, category_id, address, latitude, longitude, radius_m, image_url, image_credit FROM pois WHERE id = ? AND status = 'published'", (poi_id,)).fetchone()
    if row is None:
        return None
    item = dict(row)
    item["narrations"] = [dict(r) for r in db.execute(
        "SELECT locale, title, body FROM poi_narrations WHERE poi_id = ? AND length(trim(title)) > 0 AND length(trim(body)) > 0 ORDER BY locale", (poi_id,))]
    item["narration_locales"] = [n["locale"] for n in item["narrations"]]
    return item
