# Cài đặt Windows 11 / PowerShell

Python 3.12, Node.js 22.12+ và npm; không dùng Docker. Chạy từ gốc repository. Không ghi đè .venv, .env hoặc database đang sử dụng nếu đã có.

## Backend

Để dùng demo hiện có, chọn đường dẫn database đã được nhóm duyệt, [sao lưu/phục hồi thử](backup-restore.md), rồi chỉ định rõ trong cửa sổ chạy API:

```powershell
$demoDb = 'THAY_BANG_DUONG_DAN_TUYET_DOI_DATABASE_DA_DUYET'
.\.venv\Scripts\python.exe backend/scripts/start_demo.py --database $demoDb
```

Không tự chọn database preview/cá nhân theo tên có sẵn. Startup có dọn thống kê quá hạn. Các lệnh tiếp theo dành cho database thử nghiệm riêng mới; seed là nội dung nháp chưa kiểm duyệt, không tự công bố.

```powershell
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
$db = Join-Path 'backend/data' ('demo-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/init_db.py --database $db
.\.venv\Scripts\python.exe backend/scripts/seed_db.py --database $db --username demo-admin
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $db).Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Nhập mật khẩu riêng tại lời nhắc ẩn. Init chạy 001+002; seed vẫn là draft nên public API có thể rỗng. Với database có sẵn, xem [nâng cấp an toàn](../../backend/README.md#nâng-cấp-schema-thống-kê), không dùng init để nâng cấp.

## Admin (PowerShell thứ hai, từ gốc repo)

```powershell
Set-Location apps/admin-web
npm.cmd ci
npm.cmd run dev
```

Mở 5174; đăng nhập tài khoản đã seed. Admin và backend cần chạy đồng thời.

## Guest (PowerShell thứ ba, từ gốc repo)

```powershell
Set-Location apps/guest-web
npm.cmd ci
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev
```

Mở 5173. Đổi VITE_USE_MOCK thành true và khởi động lại Vite để xem mock. Xem [guest README](../../apps/guest-web/README.md) cho .env, giới hạn và browser test.

## Mobile (PowerShell riêng, từ gốc repo)

```powershell
Set-Location apps/mobile
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
npx.cmd expo start
```

Mặc định dùng mock. Để dùng API thật, đặt `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1`, và URL máy chủ kết thúc bằng `/api` trong `EXPO_PUBLIC_API_BASE_URL`, rồi khởi động lại Expo. Điện thoại thật cần IP LAN của máy chủ và backend chạy `--host 0.0.0.0`; không dùng localhost của điện thoại. Xem [mobile README](../../apps/mobile/README.md) và [checklist thiết bị](../mobile/testing/mobile-field-test.md).

## Kiểm tra (PowerShell riêng, từ gốc repo)

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm.cmd --prefix apps/admin-web run build
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/guest-web run build
npm.cmd --prefix apps/mobile test -- --runInBand
# Browser test cần chạy với cwd apps/guest-web
Set-Location apps/guest-web
npm.cmd run test:browser
```

Không dùng mock để xác nhận database. Proxy Vite chỉ phục vụ dev; triển khai tĩnh cần reverse proxy và SPA fallback. Analytics web/mobile, bản đồ/TTS và Dashboard đã có tích hợp; xem [bằng chứng 06/11](../testing/integration-2026-11-06.md). Chưa xác minh cài mới trên máy khác, production HTTPS, âm thanh và GPS trên thiết bị thật.

Mỗi ứng dụng có lockfile riêng và cần cài dependency riêng. Nếu PowerShell chưa nhận node/npm/npx, thêm thư mục Node đã cài vào PATH của cửa sổ hiện tại trước khi chạy. Sau khi thay đổi cấu trúc được merge, lưu thay đổi cá nhân, đồng bộ nhánh, chuyển terminal và `.env` sang `apps/<ứng-dụng>`, rồi cài lại từ lockfile. Không khởi động lại các ứng dụng từ thư mục web/mobile cũ.
