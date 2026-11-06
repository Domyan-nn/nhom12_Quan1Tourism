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

Với database đã có, chọn **đường dẫn tuyệt đối đã được nhóm duyệt**, dừng API cũ và [sao lưu/khôi phục thử](docs/deployment/backup-restore.md) trước khi chạy. Startup sẽ dọn thống kê quá hạn; không dùng database cá nhân để kiểm thử. Không khởi tạo hoặc seed lại database đã có:

```powershell
$demoDb = 'THAY_BANG_DUONG_DAN_TUYET_DOI_DATABASE_DA_DUYET'
if (-not (Test-Path -LiteralPath $demoDb -PathType Leaf)) { throw 'Chưa chọn database có sẵn' }
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $demoDb).Path
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

API sẵn sàng khi `http://127.0.0.1:8000/api/v1/health` trả `{"status":"ok"}`. `/docs` hiển thị OpenAPI. Health chỉ xác nhận tiến trình, không kiểm tra database. Backend không tự tạo hay nâng cấp database khi khởi động; yêu cầu danh mục song ngữ và analytics schema phiên bản 2. UC12 dọn thống kê hết hạn lúc khởi động và mỗi 00:00 Việt Nam; lỗi dọn theo lịch được ghi log/thử lại sau 60 giây. Cửa sổ giữ dữ liệu tính từ 00:00 Việt Nam của hôm nay trừ 29 ngày; API tắt thì lần khởi động sau dọn bù. Script chạy demo yêu cầu chọn database rõ ràng: `.\.venv\Scripts\python.exe backend/scripts/start_demo.py --database $demoDb`; không còn mặc định tệp preview của cá nhân. Không tự công bố dữ liệu mẫu chưa duyệt.

## Chạy Admin và guest web

Mặc định không đặt `SAIGON_DISABLE_CLEANUP`. Giá trị `1` tắt cả startup/lịch, chỉ dùng khi chủ động chẩn đoán; không dùng trong demo chính sách giữ 30 ngày. Hàm `run_cleanup_once(database)` vẫn dùng được; kiểm thử chỉ gọi trên database tạm.

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
.\.venv\Scripts\python.exe -m pytest backend/tests/test_analytics.py backend/tests/test_analytics_integration.py -q --basetemp=backend/.pytest-tmp
npm.cmd --prefix apps/admin-web run build
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/guest-web run build
$env:SAIGON_TEST_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm.cmd --prefix apps/guest-web run test:browser
npm.cmd --prefix apps/mobile test -- --runInBand
```

Browser test kiểm tra Admin và guest web với dữ liệu tạm; không truy cập database cá nhân. Build tĩnh cần reverse proxy `/api` về FastAPI; guest SPA cần fallback cho route chi tiết. Các lệnh kiểm thử mobile và browser không thay thế kiểm thử GPS/TTS trên thiết bị thật.

Các ca chức năng map dùng tile fixture, ca TTS dùng engine giả. Chẩn đoán tile OSM thật là opt-in, ghi riêng số response thành công/lỗi và ảnh fallback, không phát âm thanh. Để chạy riêng từ gốc repo:

```powershell
$env:SAIGON_TEST_REAL_OSM = '1'
npm.cmd --prefix apps/guest-web run test:browser -- --grep 'real OSM diagnostic' --reporter=line
Remove-Item Env:SAIGON_TEST_REAL_OSM
```

UC12 đã nối API thật trên guest **và mobile**. Khi chưa đồng ý hoặc đã từ chối thì không tạo UUID/gửi heartbeat. Heartbeat 30 giây chỉ khi hiển thị và có mạng. Rút tại mục Riêng tư; khi còn yêu cầu chờ, nút đồng ý lại bị khóa và client thử lại khi online/mở lại/hiển thị và mỗi 30 giây. Không xóa localStorage/AsyncStorage khi yêu cầu rút còn chờ. Nếu lưu trữ bị chặn thì dừng gửi và báo lỗi; yêu cầu chưa lưu có thể mất khi đóng ứng dụng. Chế độ mock không gọi mạng thống kê. Xem bằng chứng HTTP và giới hạn thiết bị ở [báo cáo 06/11](docs/testing/integration-2026-11-06.md).

Nếu môi trường hạn chế ghi cache/output báo `EPERM`, dùng `--configLoader runner` cho Vite/Vitest và chọn `--outDir dist/<ten-luot-moi>` khi build, `--output=test-results/<ten-luot-moi>` khi chạy Playwright. Nếu vẫn bị chặn, cần quyền ghi từ môi trường thực thi; không xóa thư mục cũ hoặc kết luận build/test thất bại do mã nguồn. Bản đồ web và điều kiện dùng mạng ở [guest README](apps/guest-web/README.md).

Thử khởi tạo, seed, sao lưu/phục hồi và đo NFR08 bằng HTTP thật trong **database tạm tự hủy**, không dùng `SAIGON_DATABASE` hiện có:

```powershell
.\.venv\Scripts\python.exe docs/testing/tools/verify_handoff.py
```

Script tạo 5 POI nháp từ seed và 5 POI tổng hợp riêng cho test, chỉ công bố POI test; in 20 thời gian phản hồi, số thành công dưới 3 giây và môi trường, không in mật khẩu/token. Đây là thử yêu cầu liên tiếp cục bộ, không phải thử tải đồng thời hoặc thiết bị thật. Checklist từng bước demo tại [demo-guide](docs/deployment/demo-guide.md).

Mobile chuyển sang mock vẫn giữ yêu cầu rút từ API thật, không tạo mã hoặc giả xác nhận server. Trở lại API thật để gửi pending và chỉ xóa sau khi server nhận. Không dùng nút/câu thông báo cục bộ làm bằng chứng thu hồi trên server.

## API thật và dữ liệu test riêng cho Gate 2

Fixture sau chỉ tạo SQLite trong thư mục tạm hệ thống, không đọc `SAIGON_DATABASE` có sẵn. Có 2 POI published, 1 draft, 1 hidden, danh mục có VI/EN và bài VI/EN/FR. Nội dung là fixture kiểm thử, không phải nội dung đã được duyệt. Script giữ DB khi server đang chạy và dọn khi thoát bình thường.

PowerShell thứ nhất từ gốc repo (để trống cổng 18082; không chạy đồng thời với Playwright):

```powershell
.\.venv\Scripts\python.exe -u apps/guest-web/tests/serve_api.py
```

PowerShell thứ hai từ gốc repo, chạy test mobile qua HTTP thật:

```powershell
$env:SAIGON_TEST_API_URL = 'http://127.0.0.1:18082/api'
$env:SAIGON_TEST_FIXTURE = 'gate2'
npm.cmd --prefix apps/mobile test -- --runInBand
Remove-Item Env:SAIGON_TEST_API_URL, Env:SAIGON_TEST_FIXTURE
```

`SAIGON_TEST_FIXTURE=gate2` chỉ dùng với fixture đúng ở trên; nếu chỉ có URL API thì chỉ chạy ca hợp đồng tổng quát, còn ca yêu cầu ID cụ thể được bỏ qua. Chạy `Ctrl+C` để dừng fixture khi xong. Để xem web với fixture, dùng cấu hình proxy test:

```powershell
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd --prefix apps/guest-web run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port 18174 --strictPort
```

Mở `http://127.0.0.1:18174/map`. Web dùng dữ liệu API thật và tile OSM thật (cần mạng); browser test tự động thay tile bằng fixture. Script test có route riêng `PUT /__test/pois/palace/status?status=hidden` hoặc `published` để mô phỏng ẩn/khôi phục, chỉ thay SQLite tạm. Route này chỉ đăng ký trong `tests/serve_api.py`, không tồn tại trong ứng dụng backend vận hành.

Muốn Thuận thử điện thoại trên cùng LAN, trước khi chạy fixture đặt `$env:SAIGON_TEST_HOST='0.0.0.0'` trong cửa sổ thứ nhất. Điện thoại đặt `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1`, `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:18082/api`, rồi khởi động lại Expo bằng `npx.cmd expo start --clear` từ `apps/mobile/`. Chỉ mở fixture chứa dữ liệu và tài khoản kiểm thử trên mạng phát triển tin cậy; tắt server sau khi thử. Chi tiết các bước và trạng thái chưa kiểm thử ở [checklist](docs/mobile/testing/day2-gate2-mobile.md).

## Nâng cấp database cũ

Dừng backend và mọi tiến trình ghi. Sao lưu database trước khi nâng cấp; không chạy lại `init_db.py` trên file có dữ liệu. Kiểm tra danh mục song ngữ bằng `prepare_category_bilingual.py --database <database> --check`, rồi chạy cùng script với `--backup <backup-moi>` khi đã xác nhận đường dẫn nguồn và backup mới. Với ràng buộc analytics, chạy `migrate_db.py --database <database> --check`, rồi dùng `--backup <backup-moi>` sau khi kiểm tra dữ liệu. Không chạy riêng file SQL migration lên database hiện có. Xem [hướng dẫn nâng cấp danh mục](docs/analysis-design/category-bilingual-preparation.md) và [sao lưu/phục hồi](docs/deployment/backup-restore.md).
