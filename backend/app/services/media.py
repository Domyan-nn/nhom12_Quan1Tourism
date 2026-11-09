"""Uploaded place images (F07, IImageStore).

Files live in `storage/uploads/pois/` (override with SAIGON_UPLOADS) and are served under
`/api/media/` so the existing `/api` proxies of both web apps and the mobile API origin reach them.
Only JPEG, PNG and WebP up to 2 MB are accepted; the declared type must match the file signature.
"""

import os
import uuid
from pathlib import Path

MEDIA_PREFIX = "/api/media/"
MAX_BYTES = 2 * 1024 * 1024
TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
CONTENT_TYPES = {extension: content_type for content_type, extension in TYPES.items()}
DEFAULT_UPLOADS = Path(__file__).resolve().parents[3] / "storage" / "uploads"


class UnsupportedImage(ValueError):
    pass


class InvalidImage(ValueError):
    pass


def uploads_dir() -> Path:
    return Path(os.environ.get("SAIGON_UPLOADS") or DEFAULT_UPLOADS).resolve()


def extension_for(content_type: str | None, data: bytes) -> str:
    """Return the file extension, or raise if the type is not allowed or the bytes disagree."""
    declared = (content_type or "").split(";")[0].strip().lower()
    if declared not in TYPES:
        raise UnsupportedImage(declared)
    signatures = {
        "jpg": data[:3] == b"\xff\xd8\xff",
        "png": data[:8] == b"\x89PNG\r\n\x1a\n",
        "webp": data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    }
    extension = TYPES[declared]
    if not signatures[extension]:
        raise InvalidImage(declared)
    return extension


def save_poi_image(data: bytes, extension: str) -> str:
    folder = uploads_dir() / "pois"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4()}.{extension}"
    # Exclusive creation: never overwrite an existing file.
    with (folder / name).open("xb") as handle:
        handle.write(data)
    return f"{MEDIA_PREFIX}pois/{name}"


def path_for(url: str | None) -> Path | None:
    """Local file for a media URL created by save_poi_image; None for anything else."""
    if not url or not url.startswith(MEDIA_PREFIX):
        return None
    relative = url[len(MEDIA_PREFIX):]
    parts = relative.split("/")
    if len(parts) != 2 or parts[0] != "pois" or "." not in parts[1]:
        return None
    stem, extension = parts[1].rsplit(".", 1)
    try:
        if str(uuid.UUID(stem)) != stem or extension not in CONTENT_TYPES:
            return None
    except ValueError:
        return None
    root = uploads_dir()
    path = (root / "pois" / parts[1]).resolve()
    return path if path.parent == (root / "pois").resolve() else None


def delete_media(url: str | None) -> None:
    path = path_for(url)
    if path is not None:
        path.unlink(missing_ok=True)
