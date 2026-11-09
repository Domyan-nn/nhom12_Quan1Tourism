"""Serve uploaded place images at /api/media/pois/<uuid>.<jpg|png|webp> (public, like the images they replace)."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services import media

router = APIRouter(prefix="/api/media", tags=["media"])


@router.get("/pois/{name}")
def poi_image(name: str):
    path = media.path_for(f"{media.MEDIA_PREFIX}pois/{name}")
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="MEDIA_NOT_FOUND")
    extension = path.suffix.lstrip(".")
    return FileResponse(path, media_type=media.CONTENT_TYPES[extension],
                        headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})
