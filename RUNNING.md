# Hướng dẫn chạy Saigon Stories

Các lệnh dưới đây dùng PowerShell trên Windows 11, bắt đầu tại thư mục gốc repository. Cần Python 3.12, Node.js 22.12+ và npm; không dùng Docker. Mỗi ứng dụng có dependency riêng. Kiểm tra `node --version`, `npm.cmd --version` và `python --version`. Kích hoạt `.venv` chỉ giúp PowerShell tìm Python, không thêm Node/npm vào PATH.

Nếu `npm.cmd` không được nhận diện nhưng đã có Node portable, đặt `$nodeDir` thành thư mục **chứa cả `node.exe` và `npm.cmd`**, rồi chạy trong **mỗi cửa sổ PowerShell** dùng npm:

```powershell
$nodeDir = 'DUONG_DAN_THU_MUC_NODE_PORTABLE'
if (-not (Test-Path -LiteralPath (Join-Path $nodeDir 'npm.cmd'))) { throw 'Không tìm thấy npm.cmd trong thư mục Node' }
$env:Path = "$nodeDir;$env:Path"
node --version
npm.cmd --version
```

Nếu chưa có Node, cài Node.js 22.12+ rồi mở PowerShell mới. Thay đổi `$env:Path` ở trên chỉ áp dụng cho cửa sổ hiện tại.

## Chuẩn bị backend và database thử nghiệm

Nếu tài khoản Windows đã có `SAIGON_DATABASE` trỏ tới database hợp lệ, mở PowerShell mới và chạy backend trực tiếp; không khởi tạo hoặc seed lại:

```powershell
$env:SAIGON_DATABASE = [Environment]::GetEnvironmentVariable('SAIGON_DATABASE', 'User')
if (-not (Test-Path -LiteralPath $env:SAIGON_DATABASE)) { throw 'SAIGON_DATABASE chưa trỏ tới database có sẵn' }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Nếu PowerShell đang mở từ trước khi cấu hình môi trường và chưa nhận `npm.cmd`, nạp lại PATH bằng `$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path`.

Chọn **tên database mới**, không dùng `backend/data/saigon_stories.db` hoặc database cá nhân. `init_db.py` tạo schema qua các migration hiện có; seed yêu cầu nhập mật khẩu Admin trong lời nhắc ẩn và tạo địa điểm ở trạng thái `draft`.

```powershell
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
$db = "backend/data/demo-$([guid]::NewGuid().ToString('N')).db"
if (Test-Path -LiteralPath $db) { throw 'Database đã tồn tại; chọn tên mới' }
.\.venv\Scripts\python.exe backend/scripts/init_db.py --database $db
.\.venv\Scripts\python.exe backend/scripts/seed_db.py --database $db --username demo-admin
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $db).Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

API sẵn sàng khi `http://127.0.0.1:8000/api/v1/health` trả `{"status":"ok"}`. `/docs` hiển thị OpenAPI. Health chỉ xác nhận tiến trình, không kiểm tra database. Backend không tự tạo hay nâng cấp database khi khởi động. Để dùng database demo preview có sẵn, sau khi cài dependency có thể chạy `.\.venv\Scripts\python.exe backend/scripts/start_demo.py`; preview có dữ liệu thử nghiệm `published`, chưa được kiểm duyệt.

## Chạy Admin và guest web

Mở hai cửa sổ PowerShell khác từ gốc repo. Admin ở `http://127.0.0.1:5174`, guest ở `http://127.0.0.1:5173`. Vite chuyển `/api` về FastAPI trên cổng 8000.

```powershell
Set-Location apps/admin-web
npm.cmd ci
npm.cmd run dev
```

```powershell
Set-Location apps/guest-web
npm.cmd ci
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev
```

Đăng nhập Admin bằng tài khoản vừa seed. Seed chỉ tạo `draft`, nên guest web dùng API thật có thể hiển thị danh sách rỗng; không công bố nội dung mẫu chưa kiểm duyệt để thử. Muốn xem mock riêng, đặt `VITE_USE_MOCK=true` trước khi khởi động lại guest Vite. Biến môi trường PowerShell ưu tiên hơn `.env`. Không có fallback sang mock khi API thật lỗi. Đổi chế độ cần dừng và chạy lại Vite.

## Chạy mobile

```powershell
Set-Location apps/mobile
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
npx.cmd expo start
```

Mobile mặc định dùng mock. Để dùng API thật, đặt `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1` và `EXPO_PUBLIC_API_BASE_URL` kết thúc bằng `/api` trong `.env`, rồi khởi động lại Expo. Thiết bị thật cần IP LAN của máy chạy backend; backend phải lắng nghe trên `0.0.0.0` trên mạng phát triển tin cậy. `localhost` trên điện thoại là chính điện thoại. Chưa kiểm thử thiết bị thật.

## Kiểm thử và build

Từ gốc repo, chạy các lệnh sau trong môi trường đã cài dependency. Browser test tự tạo SQLite tạm và chạy backend cùng hai ứng dụng trên cổng 18082, 18173, 18174, 18175. Cần Microsoft Edge; cả bốn cổng phải trống.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
.\.venv\Scripts\python.exe -m pytest backend/tests/test_analytics.py -q --basetemp=backend/.pytest-tmp
npm.cmd --prefix apps/admin-web run build
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/guest-web run build
$env:SAIGON_TEST_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm.cmd --prefix apps/guest-web run test:browser
npm.cmd --prefix apps/mobile test -- --runInBand
```

Browser test kiểm tra Admin và guest web với dữ liệu tạm; không truy cập database cá nhân. Build tĩnh cần reverse proxy `/api` về FastAPI; guest SPA cần fallback cho route chi tiết. Các lệnh kiểm thử mobile và browser không thay thế kiểm thử GPS/TTS trên thiết bị thật.

## Nâng cấp database cũ

Dừng backend và mọi tiến trình ghi. Sao lưu database trước khi nâng cấp; không chạy lại `init_db.py` trên file có dữ liệu. Kiểm tra danh mục song ngữ bằng `prepare_category_bilingual.py --database <database> --check`, rồi chạy cùng script với `--backup <backup-moi>` khi đã xác nhận đường dẫn nguồn và backup mới. Với ràng buộc analytics, chạy `migrate_db.py --database <database> --check`, rồi dùng `--backup <backup-moi>` sau khi kiểm tra dữ liệu. Không chạy riêng file SQL migration lên database hiện có. Xem [hướng dẫn nâng cấp danh mục](docs/analysis-design/category-bilingual-preparation.md) và [sao lưu/phục hồi](docs/deployment/backup-restore.md).
