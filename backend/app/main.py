"""FastAPI entry point."""

import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import auth, categories, public, admin_pois
from app.db.connection import configured_database, validate_category_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_category_schema(configured_database())
    yield


app = FastAPI(title="Saigon Stories API", version="0.1.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(public.router)
app.include_router(admin_pois.router)

ERROR_MESSAGES = {
    "INVALID_CREDENTIALS": "Tên đăng nhập hoặc mật khẩu không hợp lệ, hoặc tài khoản bị khóa.",
    "AUTH_REQUIRED": "Phiên quản trị không hợp lệ hoặc đã hết hạn.",
    "CATEGORY_DUPLICATE": "Tên danh mục đã tồn tại.",
    "CATEGORY_NOT_FOUND": "Không tìm thấy danh mục.",
    "CATEGORY_IN_USE": "Danh mục đang được địa điểm sử dụng.",
    "POI_NOT_FOUND": "Không tìm thấy địa điểm.",
    "NARRATION_DUPLICATE": "Ngôn ngữ này đã có bài thuyết minh.",
    "NARRATION_NOT_FOUND": "Không tìm thấy bài thuyết minh.",
}


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    code = exc.detail if isinstance(exc.detail, str) and exc.detail in ERROR_MESSAGES else "HTTP_ERROR"
    return JSONResponse(status_code=exc.status_code, headers=exc.headers,
                        content={"error": {"code": code, "message": ERROR_MESSAGES.get(code, "Yêu cầu không thành công."), "details": []}})


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
