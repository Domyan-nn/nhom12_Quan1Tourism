"""Điền nội dung demo thật vào các bản ghi mẫu do seed_db.py tạo (mặc định chỉ xem trước, không ghi).

Quy tắc an toàn:
  * Chỉ thay bài thuyết minh còn là câu giữ chỗ của seed; bài nhóm đã sửa hoặc viết thêm được giữ nguyên.
  * Chỉ đổi địa chỉ/tọa độ khi vẫn đúng bằng giá trị placeholder của seed.
  * Không đổi trạng thái: địa điểm vẫn là 'draft'. Công bố làm qua Admin (UC09), vì khi đó API kiểm tra BR04.
  * Dùng ID ổn định của seed_db, nên chạy lại nhiều lần không tạo bản ghi trùng.
"""

import argparse
import sqlite3
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.db.connection import DEFAULT_DATABASE, connect
from scripts.demo_content import CONTENT
from scripts.seed_db import PLACES, stable_id

PLACEHOLDER_TITLE_PREFIXES = ("[MẪU CHƯA KIỂM DUYỆT]", "[UNREVIEWED SAMPLE]")
SEED = {key: (address, lat, lon) for key, _name, address, lat, lon, _cat in PLACES}


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text.strip())


def enrich(database: Path, apply: bool) -> list[str]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    report: list[str] = []
    connection = connect(database)
    try:
        with connection:
            for key, content in CONTENT.items():
                poi_id = stable_id("poi:" + key)
                row = connection.execute("SELECT address, latitude, longitude FROM pois WHERE id = ?", (poi_id,)).fetchone()
                if row is None:
                    report.append(f"[{key}] BỎ QUA: chưa có địa điểm này, hãy chạy seed_db.py trước")
                    continue

                seed_address, seed_lat, seed_lon = SEED[key]
                changes = {}
                if row["address"] == seed_address and nfc(content["address"]) != row["address"]:
                    changes["address"] = nfc(content["address"])
                elif row["address"] != seed_address and row["address"] != nfc(content["address"]):
                    report.append(f"[{key}] giữ địa chỉ hiện tại (đã được sửa, khác bản seed)")
                if content["coordinates"] is not None:
                    lat, lon = content["coordinates"]
                    if (row["latitude"], row["longitude"]) == (seed_lat, seed_lon) and (lat, lon) != (seed_lat, seed_lon):
                        changes["latitude"], changes["longitude"] = lat, lon
                    elif (row["latitude"], row["longitude"]) not in ((seed_lat, seed_lon), (lat, lon)):
                        report.append(f"[{key}] giữ tọa độ hiện tại (đã được sửa, khác bản seed)")
                if changes:
                    report.append(f"[{key}] cập nhật {', '.join(changes)}")
                    if apply:
                        sets = ", ".join(f"{column} = ?" for column in changes)
                        connection.execute(f"UPDATE pois SET {sets}, updated_at = ? WHERE id = ?", (*changes.values(), now, poi_id))

                for locale, (title, body) in content["narrations"].items():
                    narration = connection.execute(
                        "SELECT id, title, body FROM poi_narrations WHERE poi_id = ? AND locale = ?", (poi_id, locale)
                    ).fetchone()
                    if narration is None:
                        report.append(f"[{key}/{locale}] thêm bài mới")
                        if apply:
                            connection.execute(
                                "INSERT INTO poi_narrations (id, poi_id, locale, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                (stable_id(f"narration:{key}:{locale}"), poi_id, locale, title, body, now, now),
                            )
                    elif (narration["title"], narration["body"]) == (title, body):
                        report.append(f"[{key}/{locale}] đã là nội dung này, không đổi")
                    elif narration["title"].startswith(PLACEHOLDER_TITLE_PREFIXES):
                        report.append(f"[{key}/{locale}] thay bài giữ chỗ bằng nội dung thật")
                        if apply:
                            connection.execute(
                                "UPDATE poi_narrations SET title = ?, body = ?, updated_at = ? WHERE id = ?",
                                (title, body, now, narration["id"]),
                            )
                    else:
                        report.append(f"[{key}/{locale}] GIỮ NGUYÊN: bài đã được nhóm sửa")
            if not apply:
                connection.rollback()
    finally:
        connection.close()
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--apply", action="store_true", help="ghi vào database (mặc định chỉ in kế hoạch)")
    args = parser.parse_args()
    try:
        report = enrich(args.database, args.apply)
    except (sqlite3.Error, OSError) as exc:
        parser.exit(1, f"Thất bại: {exc}\n")
    print("\n".join(report))
    print("\nĐã ghi vào database." if args.apply else "\nChỉ xem trước. Thêm --apply để ghi. Hãy sao lưu database trước (scripts/backup_db.py).")
    print("Tất cả địa điểm vẫn là 'draft'; nhóm đọc lại nội dung rồi công bố qua Admin.")


if __name__ == "__main__":
    main()
