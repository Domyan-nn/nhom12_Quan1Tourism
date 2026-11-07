# Cài đặt Windows 11 / PowerShell

Python 3.12, Node.js 22.13+ (nhánh 22), 24.3+ (nhánh 24) hoặc 26+, và npm; không dùng Docker. Chạy từ gốc repository. Không ghi đè .venv, .env hoặc database đang sử dụng nếu đã có.

## Backend và DB chính

DB vận hành duy nhất là `backend/data/saigon_stories.db`. Trên máy hiện tại, schema và dữ liệu đã được chuyển nguyên từ `local-dev.db` ngày 07/11/2026. Các DB demo/preview cũ đã được dọn; ZIP dự phòng ở `backups/`. Khi clone mới, DB không có trong Git: phục hồi snapshot cục bộ theo [backup-restore](backup-restore.md), không tự seed lại DB chính.

Cài dependency một lần từ gốc repo:

```powershell
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm.cmd --prefix apps/admin-web ci
npm.cmd --prefix apps/guest-web ci
npm.cmd --prefix apps/mobile ci
```

Bật cả hệ thống với DB chính:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-system.ps1
```

Script sao lưu trước khi khởi động, chọn DB chính rõ ràng và cấu hình hai client khách dùng API thật. Dừng bằng `powershell -ExecutionPolicy Bypass -File scripts/stop-system.ps1`. Các khối sau chỉ dành cho chạy riêng từng ứng dụng; không chạy chồng với script. Xem [RUNNING](../../RUNNING.md) để chạy API riêng, chọn IP LAN, xem log và kiểm tra dữ liệu.

Init/seed chỉ dùng khi chủ động tạo DB thử nghiệm mới ở thư mục tạm. `backend/scripts/start_demo.py` vẫn yêu cầu chỉ định DB riêng để phục vụ kiểm thử/phục hồi, không phải lệnh khởi động mặc định.

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

Mặc định dùng API thật chung DB chính. Cấu hình `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1`, và URL máy chủ kết thúc bằng `/api` trong `EXPO_PUBLIC_API_BASE_URL`, rồi khởi động lại Expo. Điện thoại thật cần IP LAN của máy chủ và backend chạy `--host 0.0.0.0`; không dùng localhost của điện thoại. Xem [mobile README](../../apps/mobile/README.md) và [checklist thiết bị](../mobile/testing/mobile-field-test.md).

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

Không dùng mock để xác nhận database. Proxy Vite chỉ phục vụ dev; triển khai tĩnh cần reverse proxy và SPA fallback. Analytics web/mobile, bản đồ/TTS và Dashboard đã có tích hợp; xem [bằng chứng 06/11](../testing/integration-2026-11-06.md). Người dùng đã xác nhận Admin/Guest web đạt, mobile map/quyền/GPS/TTS VI/EN hoạt động ổn ngày 07/11; UC12 mobile đang chờ thử API thật. Cài mới trên máy khác và production HTTPS chưa được xác minh. Xem kết quả hiện tại trong docs/testing/test-results.md.

Mỗi ứng dụng có lockfile riêng và cần cài dependency riêng. Nếu PowerShell chưa nhận node/npm/npx, thêm thư mục Node đã cài vào PATH của cửa sổ hiện tại trước khi chạy. Sau khi thay đổi cấu trúc được merge, lưu thay đổi cá nhân, đồng bộ nhánh, chuyển terminal và `.env` sang `apps/<ứng-dụng>`, rồi cài lại từ lockfile. Không khởi động lại các ứng dụng từ thư mục web/mobile cũ.
