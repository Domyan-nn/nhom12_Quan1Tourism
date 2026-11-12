"""FastAPI entry point."""

import asyncio
import os
import sqlite3
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import auth, categories, public, admin_pois, admin_stats, admin_audit, analytics, media
from app.db.connection import configured_database, validate_analytics_schema, validate_category_schema, validate_schema_version
from app.services.analytics_retention import cleanup_database, retention_loop


def run_cleanup_once(database=None) -> dict:
    """Xóa lượt/phiên thống kê quá 30 ngày theo ngày Asia/Ho_Chi_Minh (UC10, mục 5.4)."""
    return cleanup_database(database or configured_database())


@asynccontextmanager
async def lifespan(app: FastAPI):
    database = configured_database()
    validate_category_schema(database)
    validate_analytics_schema(database)
    validate_schema_version(database)
    # Existing schema only: never initialize or migrate a developer database.
    retention = None
    if os.environ.get("SAIGON_DISABLE_CLEANUP") != "1":
        await asyncio.to_thread(run_cleanup_once, database)
        retention = asyncio.create_task(retention_loop(database))
    try:
        yield
    finally:
        if retention:
            retention.cancel()
            with suppress(asyncio.CancelledError):
                await retention


app = FastAPI(title="Saigon Stories API", version="0.1.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(public.router)
app.include_router(admin_pois.router)
app.include_router(admin_stats.router)
app.include_router(admin_audit.router)
app.include_router(media.router)
# Giữ đường dẫn cũ /api/analytics (client hiện tại) và đường dẫn theo hợp đồng /api/v1/analytics.
app.include_router(analytics.router)
app.include_router(analytics.v1_router)

ERROR_MESSAGES = {
    "INVALID_CREDENTIALS": "Tên đăng nhập hoặc mật khẩu không hợp lệ, hoặc tài khoản bị khóa.",
    "AUTH_REQUIRED": "Phiên quản trị không hợp lệ hoặc đã hết hạn.",
    "TOO_MANY_ATTEMPTS": "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.",
    "CATEGORY_DUPLICATE": "Tên danh mục đã tồn tại.",
    "CATEGORY_NOT_FOUND": "Không tìm thấy danh mục.",
    "CATEGORY_IN_USE": "Danh mục đang được địa điểm sử dụng.",
    "POI_NOT_FOUND": "Không tìm thấy địa điểm.",
    "NARRATION_DUPLICATE": "Ngôn ngữ này đã có bài thuyết minh.",
    "NARRATION_NOT_FOUND": "Không tìm thấy bài thuyết minh.",
    "NARRATION_REQUIRED": "Địa điểm đang công khai phải còn ít nhất một bài thuyết minh.",
    "POI_NOT_PUBLISHABLE": "Địa điểm chưa đủ điều kiện công bố.",
    "INVALID_STATUS_TRANSITION": "Trạng thái hiện tại không cho phép thao tác này.",
    "INVALID_DATE_RANGE": "Khoảng ngày không hợp lệ hoặc ngoài 30 ngày gần nhất.",
    "UNSUPPORTED_IMAGE_TYPE": "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
    "IMAGE_TOO_LARGE": "Ảnh vượt quá 2 MB.",
    "INVALID_IMAGE": "Nội dung tệp không phải ảnh đúng loại đã khai báo.",
    "MEDIA_NOT_FOUND": "Không tìm thấy ảnh.",
    "session_revoked": "Phiên thống kê đã rút đồng ý.",
}


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail, details = exc.detail, []
    if isinstance(detail, dict):
        detail, details = detail.get("code"), list(detail.get("details", []))
    code = detail if isinstance(detail, str) and detail in ERROR_MESSAGES else "HTTP_ERROR"
    content = {"error": {"code": code, "message": ERROR_MESSAGES.get(code, "Yêu cầu không thành công."), "details": details}}
    if code == "session_revoked":
        # Compatibility with An's original /api/analytics contract.
        content["detail"] = "session_revoked"
    return JSONResponse(status_code=exc.status_code, headers=exc.headers, content=content)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    # Never echo request bodies, including passwords, in validation errors.
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ.", "details": []}})


@app.exception_handler(sqlite3.Error)
async def database_error(request: Request, exc: sqlite3.Error):
    return JSONResponse(status_code=500, content={"error": {"code": "DATABASE_ERROR", "message": "Không thể xử lý dữ liệu.", "details": []}})


@app.get("/api/v1/health")
def health():
    """Process health only; does not claim database readiness."""
    return {"status": "ok"}
