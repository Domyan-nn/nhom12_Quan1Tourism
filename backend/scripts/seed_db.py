"""Insert unreviewed demo content without overwriting existing records."""

import argparse
import base64
import getpass
import hashlib
import os
import sqlite3
import sys
import unicodedata
import uuid
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.db.connection import DEFAULT_DATABASE, connect

NAMESPACE = uuid.UUID("c1530e19-3946-47ff-833d-e2b239e5162a")
ITERATIONS = 600_000

# Coordinates and addresses are approximate placeholders; verify before publishing.
PLACES = (
    ("dinh-doc-lap", "Dinh Độc Lập", "135 Nam Kỳ Khởi Nghĩa, Quận 1", 10.7770, 106.6953, "history"),
    ("nha-tho-duc-ba", "Nhà thờ Đức Bà", "Công xã Paris, Quận 1", 10.7798, 106.6990, "history"),
    ("buu-dien", "Bưu điện Trung tâm", "Công xã Paris, Quận 1", 10.7799, 106.6997, "history"),
    ("cho-ben-thanh", "Chợ Bến Thành", "Lê Lợi, Quận 1", 10.7720, 106.6980, "culture"),
    ("nha-hat", "Nhà hát Thành phố", "Công trường Lam Sơn, Quận 1", 10.7768, 106.7031, "culture"),
)
CATEGORIES = (("history", "Di tích"), ("culture", "Văn hóa"))


def stable_id(value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, value))


def password_hash(password: str) -> str:
    """PBKDF2-SHA256, with a fresh random salt; format recorded for future login."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    b64 = lambda value: base64.b64encode(value).decode("ascii")
    return f"pbkdf2_sha256${ITERATIONS}${b64(salt)}${b64(digest)}"


def seed(database: Path, username: str, password: str) -> None:
    username = unicodedata.normalize("NFC", username.strip()).casefold()
    if not username or not password:
        raise ValueError("Admin username and password must not be empty")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    connection = connect(database)
    try:
        with connection:
            # Fail visibly on collisions with unrelated rows; roll back the whole seed.
            admin_id = stable_id("admin:demo")
            existing_admin = connection.execute("SELECT id FROM admin_accounts WHERE username = ?", (username,)).fetchone()
            if existing_admin and existing_admin["id"] != admin_id:
                raise ValueError("Username belongs to an existing account; choose another username")
            if not connection.execute("SELECT 1 FROM admin_accounts WHERE id = ?", (admin_id,)).fetchone():
                connection.execute(
                    "INSERT INTO admin_accounts (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    (admin_id, username, password_hash(password), now, now),
                )
            else:
                print("Demo admin already exists: username and password were not changed.")

            for key, name in CATEGORIES:
                category_id = stable_id("category:" + key)
                normalized = unicodedata.normalize("NFC", name.strip()).casefold()
                conflict = connection.execute("SELECT id FROM categories WHERE normalized_name = ?", (normalized,)).fetchone()
                if conflict and conflict["id"] != category_id:
                    raise ValueError(f"Category '{name}' already exists with another ID; review it before seeding")
                connection.execute(
                    "INSERT INTO categories (id, name, normalized_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
                    (category_id, name, normalized, now, now),
                )

            for key, name, address, lat, lon, category in PLACES:
                poi_id = stable_id("poi:" + key)
                for row in connection.execute("SELECT id, name FROM pois"):
                    if row["id"] != poi_id and unicodedata.normalize("NFC", row["name"].strip()).casefold() == name.casefold():
                        raise ValueError(f"Place '{name}' already exists with another ID; review it before seeding")
                connection.execute(
                    "INSERT INTO pois (id, category_id, name, address, latitude, longitude, radius_m, image_url, status, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, 100, NULL, 'draft', ?, ?) ON CONFLICT(id) DO NOTHING",
                    (poi_id, stable_id("category:" + category), name, address, lat, lon, now, now),
                )
                texts = [("vi", f"[MẪU CHƯA KIỂM DUYỆT] {name}",
                          "Nội dung minh họa chờ nhóm bổ sung và kiểm chứng nguồn trước khi công bố.")]
                if key == "dinh-doc-lap":
                    texts.append(("en", "[UNREVIEWED SAMPLE] Independence Palace",
                                  "Placeholder narration. The team must provide and verify sources before publication."))
                for locale, title, body in texts:
                    connection.execute(
                        "INSERT INTO poi_narrations (id, poi_id, locale, title, body, created_at, updated_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(poi_id, locale) DO NOTHING",
                        (stable_id("narration:" + key + ":" + locale), poi_id, locale, title, body, now, now),
                    )
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--username", required=True, help="Demo admin username (not a secret)")
    args = parser.parse_args()
    password = getpass.getpass("Demo admin password (input hidden): ")
    try:
        seed(args.database, args.username, password)
    except (sqlite3.Error, ValueError, OSError) as exc:
        parser.exit(1, f"Seed failed: {exc}\n")
    print("Seed finished. All new places are drafts; review content and coordinates before publication.")


if __name__ == "__main__":
    main()
