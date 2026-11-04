"""FastAPI entry point."""

import asyncio
import contextlib
import logging
import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import auth, categories, public, admin_pois, admin_stats, analytics
from app.db.connection import configured_database, connect, validate_category_schema
from app.services import analytics_service


CLEANUP_INTERVAL_SECONDS = 6 * 60 * 60
log = logging.getLogger("saigon.cleanup")


def run_cleanup_once(database=None) -> dict:
    """Xóa lượt/phiên thống kê quá 30 ngày theo ngày Asia/Ho_Chi_Minh (UC10, mục 5.4)."""
    conn = connect(database or configured_database())
    conn.isolation_level = None  # service tự quản lý BEGIN IMMEDIATE
    try:
        return analytics_service.cleanup_expired(conn)
    finally:
        conn.close()


async def _cleanup_loop():
    while True:
        try:
            result = await asyncio.to_thread(run_cleanup_once)
            log.info("analytics cleanup: %s", result)
        except Exception:  # không để lỗi dọn dẹp làm dừng API
            log.exception("analytics cleanup failed")
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_category_schema(configured_database())
    task = None if os.environ.get("SAIGON_DISABLE_CLEANUP") == "1" else asyncio.create_task(_cleanup_loop())
    try:
        yield
    finally:
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


app = FastAPI(title="Saigon Stories API", version="0.1.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(public.router)
app.include_router(admin_pois.router)
app.include_router(admin_stats.router)
# Giữ đường dẫn cũ /api/analytics (client hiện tại) và đường dẫn theo hợp đồng /api/v1/analytics.
app.include_router(analytics.router)
app.include_router(analytics.v1_router)

ERROR_MESSAGES = {
    "INVALID_CREDENTIALS": "Tên đăng nhập hoặc mật khẩu không hợp lệ, hoặc tài khoản bị khóa.",
    "AUTH_REQUIRED": "Phiên quản trị không hợp lệ hoặc đã hết hạn.",
    "CATEGORY_DUPLICATE": "Tên danh mục đã tồn tại.",
    "CATEGORY_NOT_FOUND": "Không tìm thấy danh mục.",
    "CATEGORY_IN_USE": "Danh mục đang được địa điểm sử dụng.",
    "POI_NOT_FOUND": "Không tìm thấy địa điểm.",
    "NARRATION_DUPLICATE": "Ngôn ngữ này đã có bài thuyết minh.",
    "NARRATION_NOT_FOUND": "Không tìm thấy bài thuyết minh.",
    "POI_NOT_PUBLISHABLE": "Địa điểm chưa đủ điều kiện công bố.",
    "INVALID_STATUS_TRANSITION": "Trạng thái hiện tại không cho phép thao tác này.",
    "INVALID_DATE_RANGE": "Khoảng ngày không hợp lệ hoặc ngoài 30 ngày gần nhất.",
}


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    detail, details = exc.detail, []
    if isinstance(detail, dict):
        detail, details = detail.get("code"), list(detail.get("details", []))
    code = detail if isinstance(detail, str) and detail in ERROR_MESSAGES else "HTTP_ERROR"
    return JSONResponse(status_code=exc.status_code, headers=exc.headers,
                        content={"error": {"code": code, "message": ERROR_MESSAGES.get(code, "Yêu cầu không thành công."), "details": details}})


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
