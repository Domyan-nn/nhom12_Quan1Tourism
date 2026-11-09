"""Gắn ảnh Wikimedia Commons có giấy phép mở và ghi công ảnh cho 5 địa điểm demo (mặc định chỉ xem trước).

Quy tắc an toàn:
  * Chỉ điền image_url còn trống của các địa điểm do seed_db.py tạo (ID ổn định); ảnh nhóm đã nhập được giữ.
  * Điền image_credit (tác giả, giấy phép, nguồn) khi địa điểm đang dùng đúng ảnh này và chưa có ghi công.
  * Không đổi trạng thái, nội dung hay tọa độ.
  * Ghi (--apply) bắt buộc kèm --backup tới một tệp MỚI; bản sao được kiểm tra toàn vẹn trước khi ghi.

Nguồn, tác giả và giấy phép của từng ảnh ở IMAGES và docs/deployment/demo-images.md.
Các giấy phép CC BY/CC BY-SA yêu cầu ghi công tác giả khi trình bày ảnh.
"""

import argparse
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.db.connection import DEFAULT_DATABASE, connect
from scripts.backup_db import backup_database
from scripts.seed_db import stable_id

COMMONS = "https://upload.wikimedia.org/wikipedia/commons/thumb/"
IMAGES = {
    "dinh-doc-lap": {
        "url": COMMONS + "7/7d/20190923_Independence_Palace-10.jpg/1280px-20190923_Independence_Palace-10.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-10.jpg",
        "author": "Balon Greyjoy", "license": "CC0 1.0",
    },
    "nha-tho-duc-ba": {
        "url": COMMONS + "d/d7/Bas%C3%ADlica_de_Nuestra_Se%C3%B1ora%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_03.JPG/"
               "1280px-Bas%C3%ADlica_de_Nuestra_Se%C3%B1ora%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_03.JPG",
        "source": "https://commons.wikimedia.org/wiki/File:Bas%C3%ADlica_de_Nuestra_Se%C3%B1ora,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_03.JPG",
        "author": "Diego Delso", "license": "CC BY-SA 3.0",
    },
    "buu-dien": {
        "url": COMMONS + "0/03/Saigon_Central_Post_Office_%2852681461470%29.jpg/1280px-Saigon_Central_Post_Office_%2852681461470%29.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Saigon_Central_Post_Office_(52681461470).jpg",
        "author": "Kevin Rutherford", "license": "CC BY-SA 2.0",
    },
    "cho-ben-thanh": {
        "url": COMMONS + "f/f5/Ben_Thanh%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_01.JPG/"
               "1280px-Ben_Thanh%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_01.JPG",
        "source": "https://commons.wikimedia.org/wiki/File:Ben_Thanh,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_01.JPG",
        "author": "Diego Delso", "license": "CC BY-SA 3.0",
    },
    "nha-hat": {
        "url": COMMONS + "a/ae/Lascar_Municipal_Theatre_%284608017466%29.jpg/1280px-Lascar_Municipal_Theatre_%284608017466%29.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Lascar_Municipal_Theatre_(4608017466).jpg",
        "author": "Jorge Láscar", "license": "CC BY 2.0",
    },
}


def credit(image: dict) -> str:
    return f"{image['author']}, {image['license']}, Wikimedia Commons"


def add_images(database: Path, apply: bool, backup: Path | None = None) -> list[str]:
    if apply:
        if backup is None:
            raise ValueError("Ghi vào database cần --backup trỏ tới một tệp mới.")
        backup_database(database, backup)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    report: list[str] = []
    connection = connect(database)
    try:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            for key, image in IMAGES.items():
                poi_id = stable_id("poi:" + key)
                row = connection.execute("SELECT image_url, image_credit FROM pois WHERE id = ?", (poi_id,)).fetchone()
                if row is None:
                    report.append(f"[{key}] BỎ QUA: chưa có địa điểm này (chạy seed_db.py trước)")
                elif row["image_url"] == image["url"] and row["image_credit"]:
                    report.append(f"[{key}] đã có ảnh và ghi công, không đổi")
                elif row["image_url"] == image["url"]:
                    report.append(f"[{key}] thêm ghi công: {credit(image)}")
                    connection.execute("UPDATE pois SET image_credit = ?, updated_at = ? WHERE id = ?", (credit(image), now, poi_id))
                elif row["image_url"]:
                    report.append(f"[{key}] GIỮ NGUYÊN: địa điểm đã có ảnh khác")
                else:
                    report.append(f"[{key}] gắn ảnh {image['license']} của {image['author']}")
                    connection.execute("UPDATE pois SET image_url = ?, image_credit = ?, updated_at = ? WHERE id = ?",
                                       (image["url"], credit(image), now, poi_id))
            if not apply:
                connection.rollback()
    finally:
        connection.close()
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--apply", action="store_true", help="ghi vào database (mặc định chỉ in kế hoạch)")
    parser.add_argument("--backup", type=Path, help="bắt buộc khi --apply; tệp chưa tồn tại")
    args = parser.parse_args()
    try:
        report = add_images(args.database, args.apply, args.backup)
    except (sqlite3.Error, OSError, ValueError, TimeoutError) as exc:
        parser.exit(1, f"Thất bại, không ghi gì: {exc}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(report))
    print(f"\nĐã ghi; bản sao lưu: {args.backup}" if args.apply else "\nChỉ xem trước. Thêm --apply --backup <tệp mới> để ghi.")


if __name__ == "__main__":
    main()
