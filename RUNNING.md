# Hướng dẫn demo Saigon Stories trên máy hiện tại

Các lệnh dưới đây dùng PowerShell trên máy đang có dự án tại `D:\cnpm\nhom12_Quan1Tourism`. Có thể sao chép nguyên từng khối lệnh; không cần thay đường dẫn. Máy đã có Node/npm, môi trường Python `.venv` và database `local-dev.db`.

| Thành phần | Đường dẫn / địa chỉ trên máy |
| --- | --- |
| Dự án | `D:\cnpm\nhom12_Quan1Tourism` |
| Node/npm | `C:\Program Files\nodejs` |
| Python | `D:\cnpm\nhom12_Quan1Tourism\.venv\Scripts\python.exe` |
| Database demo hiện có | `D:\cnpm\nhom12_Quan1Tourism\backend\data\local-dev.db` |
| Backend | <http://127.0.0.1:8000> |
| Admin web | <http://127.0.0.1:5174> |
| Guest web | <http://127.0.0.1:5173> |

## 1. Cửa sổ PowerShell thứ nhất: chạy backend

Chạy backend trước, giữ cửa sổ này mở trong suốt buổi demo. Nếu backend đã chạy tại cổng 8000 thì dùng tiến trình đó hoặc nhấn `Ctrl+C` ở cửa sổ cũ trước khi chạy lại.

Khối lệnh sau sao lưu database vào một tệp mới rồi khởi động API với dữ liệu hiện có. Không chạy lại `init_db.py` hoặc `seed_db.py` trên `local-dev.db`.

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:SAIGON_DATABASE = 'D:\cnpm\nhom12_Quan1Tourism\backend\data\local-dev.db'
if (-not (Test-Path -LiteralPath $env:SAIGON_DATABASE -PathType Leaf)) { throw 'Không tìm thấy local-dev.db' }
Remove-Item Env:SAIGON_DISABLE_CLEANUP -ErrorAction SilentlyContinue
$backupPath = Join-Path 'D:\cnpm\nhom12_Quan1Tourism\backend\data' ('local-dev-backup-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/backup_db.py --database $env:SAIGON_DATABASE --destination $backupPath
if ($LASTEXITCODE -ne 0) { throw 'Sao lưu thất bại; chưa khởi động backend' }
Write-Output "Database backup: $backupPath"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Chờ thấy `Application startup complete` và `Uvicorn running on http://127.0.0.1:8000`. Mở <http://127.0.0.1:8000/api/v1/health>, kết quả cần là `{"status":"ok"}`. Tài liệu API ở <http://127.0.0.1:8000/docs>.

Backend yêu cầu schema danh mục song ngữ và analytics phiên bản 2; không tự tạo hay nâng cấp database. Startup và lịch 00:00 Việt Nam sẽ dọn thống kê ngoài cửa sổ 30 ngày, nên có bước sao lưu trước khi chạy. Health chỉ xác nhận tiến trình; có thể kiểm tra thêm <http://127.0.0.1:8000/api/v1/categories> và <http://127.0.0.1:8000/api/v1/pois> để xác nhận API đọc dữ liệu.

## 2. Cửa sổ PowerShell thứ hai: chạy Admin web

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm.cmd --prefix apps/admin-web run dev -- --strictPort
```

Mở <http://127.0.0.1:5174> và đăng nhập bằng tài khoản Admin đã tạo trong `local-dev.db`. Dùng mật khẩu hiện có; chạy lại seed không đặt lại mật khẩu.

## 3. Cửa sổ PowerShell thứ ba: chạy Guest web

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd --prefix apps/guest-web run dev -- --strictPort
```

Mở <http://127.0.0.1:5173>. Cả hai web chuyển `/api` về backend cổng 8000. Giữ cả ba cửa sổ PowerShell chạy đồng thời; khi kết thúc, nhấn `Ctrl+C` trong từng cửa sổ.

Guest dùng dữ liệu API thật và chỉ hiển thị địa điểm đã công bố. Nếu database chỉ có bản nháp thì danh sách có thể rỗng; kiểm tra nội dung trong Admin trước khi công bố. Seed tạo nội dung placeholder, chưa được duyệt. Biến môi trường PowerShell ưu tiên hơn `.env`; thay đổi chế độ mock cần dừng và chạy lại Vite. Không có fallback sang mock khi API lỗi.

## Khi gặp lỗi trên máy này

| Hiện tượng | Cách xử lý |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:8000` | Backend chưa chạy hoặc đã dừng. Chạy bước 1, chờ startup thành công rồi tải lại web. |
| `npm.cmd` không được nhận diện | Chạy dòng `$env:Path = "C:\Program Files\nodejs;$env:Path"` trong chính cửa sổ đang dùng npm. |
| `Không tìm thấy npm.cmd trong thư mục Node` khi dùng hướng dẫn cũ | Dùng đường dẫn thật `C:\Program Files\nodejs` như các khối trên. |
| Cổng 8000, 5173 hoặc 5174 đã được sử dụng | Dùng cửa sổ đang chạy dịch vụ, hoặc nhấn `Ctrl+C` ở cửa sổ cũ rồi chạy lại. `--strictPort` giữ nguyên cổng web thay vì tự đổi. |
| Admin báo sai tài khoản/mật khẩu | Dùng tài khoản đã tạo trong `local-dev.db`; không tạo lại database để xử lý lỗi đăng nhập. |
| Thiếu dependency hoặc thiếu thư mục `node_modules` | Dừng dịch vụ liên quan và chạy khối cài lại dependency bên dưới. |

Các lệnh gọi thẳng Python trong `.venv` và dùng `npm.cmd`, nên không cần kích hoạt `.venv` hoặc đổi Execution Policy để demo web. Việc thêm Node vào PATH chỉ áp dụng cho cửa sổ hiện tại, nên đã được đặt trong cả hai khối chạy web.

## Cài lại dependency khi cần

Máy hiện đã cài dependency backend và hai web. Chỉ chạy khối này khi thiếu dependency hoặc sau khi cập nhật requirements/lockfile; không cần chạy `npm ci` mỗi lần mở demo.

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm.cmd --prefix apps/admin-web ci
npm.cmd --prefix apps/guest-web ci
```

## Mobile (tùy chọn)

Demo hai web trên máy này chỉ cần ba cửa sổ ở trên. Nếu muốn mở thêm Expo với dữ liệu mock trên cùng máy, chạy trong cửa sổ thứ tư:

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism\apps\mobile'
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
$env:EXPO_PUBLIC_USE_MOCK = 'true'
npx.cmd expo start
```

Để dùng API thật trên điện thoại, xem [hướng dẫn mobile](apps/mobile/README.md). Điện thoại cần IP LAN của máy backend và backend lắng nghe `0.0.0.0`; `127.0.0.1` trên điện thoại là chính điện thoại. GPS/TTS trên thiết bị thật vẫn cần kiểm thử riêng.

## Kiểm thử và build (tùy chọn, không cần để mở demo)

Từ gốc repo, chạy các lệnh sau trong môi trường đã cài dependency. Browser test tự tạo SQLite tạm và chạy backend cùng hai ứng dụng trên cổng 18082, 18173, 18174, 18175. Cần Microsoft Edge; cả bốn cổng phải trống.

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
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

## API thật và dữ liệu test riêng cho Gate 2 (tùy chọn)

Fixture sau chỉ tạo SQLite trong thư mục tạm hệ thống, không đọc `SAIGON_DATABASE` có sẵn. Có 2 POI published, 1 draft, 1 hidden, danh mục có VI/EN và bài VI/EN/FR. Nội dung là fixture kiểm thử, không phải nội dung đã được duyệt. Script giữ DB khi server đang chạy và dọn khi thoát bình thường.

PowerShell thứ nhất từ gốc repo (để trống cổng 18082; không chạy đồng thời với Playwright):

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
.\.venv\Scripts\python.exe -u apps/guest-web/tests/serve_api.py
```

PowerShell thứ hai từ gốc repo, chạy test mobile qua HTTP thật:

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
$env:SAIGON_TEST_API_URL = 'http://127.0.0.1:18082/api'
$env:SAIGON_TEST_FIXTURE = 'gate2'
npm.cmd --prefix apps/mobile test -- --runInBand
Remove-Item Env:SAIGON_TEST_API_URL, Env:SAIGON_TEST_FIXTURE
```

`SAIGON_TEST_FIXTURE=gate2` chỉ dùng với fixture đúng ở trên; nếu chỉ có URL API thì chỉ chạy ca hợp đồng tổng quát, còn ca yêu cầu ID cụ thể được bỏ qua. Chạy `Ctrl+C` để dừng fixture khi xong. Để xem web với fixture, dùng cấu hình proxy test:

```powershell
Set-Location 'D:\cnpm\nhom12_Quan1Tourism'
$env:Path = "C:\Program Files\nodejs;$env:Path"
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd --prefix apps/guest-web run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port 18174 --strictPort
```

Mở `http://127.0.0.1:18174/map`. Web dùng dữ liệu API thật và tile OSM thật (cần mạng); browser test tự động thay tile bằng fixture. Script test có route riêng `PUT /__test/pois/palace/status?status=hidden` hoặc `published` để mô phỏng ẩn/khôi phục, chỉ thay SQLite tạm. Route này chỉ đăng ký trong `tests/serve_api.py`, không tồn tại trong ứng dụng backend vận hành.

Muốn Thuận thử điện thoại trên cùng LAN, trước khi chạy fixture đặt `$env:SAIGON_TEST_HOST='0.0.0.0'` trong cửa sổ thứ nhất. Điện thoại đặt `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1`, `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:18082/api`, rồi khởi động lại Expo bằng `npx.cmd expo start --clear` từ `apps/mobile/`. Chỉ mở fixture chứa dữ liệu và tài khoản kiểm thử trên mạng phát triển tin cậy; tắt server sau khi thử. Chi tiết các bước và trạng thái chưa kiểm thử ở [checklist](docs/mobile/testing/day2-gate2-mobile.md).

## Nâng cấp database cũ

Dừng backend và mọi tiến trình ghi. Sao lưu database trước khi nâng cấp; không chạy lại `init_db.py` trên file có dữ liệu. Kiểm tra danh mục song ngữ bằng `prepare_category_bilingual.py --database <database> --check`, rồi chạy cùng script với `--backup <backup-moi>` khi đã xác nhận đường dẫn nguồn và backup mới. Với ràng buộc analytics, chạy `migrate_db.py --database <database> --check`, rồi dùng `--backup <backup-moi>` sau khi kiểm tra dữ liệu. Không chạy riêng file SQL migration lên database hiện có. Xem [hướng dẫn nâng cấp danh mục](docs/analysis-design/category-bilingual-preparation.md) và [sao lưu/phục hồi](docs/deployment/backup-restore.md).
