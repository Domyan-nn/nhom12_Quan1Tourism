# Chạy Saigon Stories với DB chính

Admin web, Guest web và mobile dùng chung backend FastAPI và **`backend/data/saigon_stories.db`**. DB chính đã nhận nguyên schema và dữ liệu của `local-dev.db` ngày 07/11/2026; các DB demo/preview cũ đã được dọn. DB và bản sao lưu là dữ liệu cục bộ, không nằm trong Git.

## Bật/tắt toàn hệ thống trên Windows

Từ gốc dự án, sau khi đã cài dependency:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-system.ps1
```

Script tự chọn IPv4 LAN có gateway, sao lưu DB chính vào `backups/`, bật API trên `0.0.0.0:8000`, hai Vite web và Expo SDK 58. Nếu có nhiều card mạng, chọn rõ địa chỉ máy tính:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-system.ps1 -LanAddress 192.168.1.31
```

| Thành phần | Địa chỉ |
| --- | --- |
| Guest web | <http://127.0.0.1:5173> |
| Admin web | <http://127.0.0.1:5174> |
| API / tài liệu | <http://127.0.0.1:8000/docs> |
| Health | <http://127.0.0.1:8000/api/v1/health> |
| Mobile Expo Go | `exp://<IP-LAN-máy-tính>:8081`, cùng Wi-Fi, tương thích SDK 58 |

Dùng tài khoản/mật khẩu Admin hiện có từ DB đã chuyển; không seed lại để đặt lại mật khẩu. Log và trạng thái tiến trình ở `storage/runtime/`. Script từ chối khởi động khi cổng đã có dịch vụ hoặc còn tệp trạng thái; dừng dịch vụ trước khi chạy lại:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop-system.ps1
```

Script dừng chỉ các tiến trình do script khởi chạy, kiểm tra PID và thời điểm bắt đầu để tránh dừng tiến trình khác. Với dịch vụ mở thủ công, dùng Ctrl+C tại terminal tương ứng.

## Chạy riêng từng phần

Mỗi khối ở một PowerShell từ gốc repo. Backend mặc định dùng DB chính khi không có `SAIGON_DATABASE`; khối sau chỉ định rõ để tránh biến cũ trỏ DB đã xóa:

```powershell
$env:SAIGON_DATABASE = (Resolve-Path 'backend/data/saigon_stories.db').Path
New-Item -ItemType Directory -Path backups -Force | Out-Null
$backupPath = Join-Path 'backups' ('before-start-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/backup_db.py --database $env:SAIGON_DATABASE --destination $backupPath
if ($LASTEXITCODE -ne 0) { throw 'Sao lưu thất bại' }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

**DB tạo trước 09/11/2026 (schema 2)** phải chạy migration 004 một lần trước khi bật API mới, nếu không API từ chối khởi động:

```powershell
.\.venv\Scripts\python.exe backend/scripts/migrate_004_poi_image_credit.py --database backend/data/saigon_stories.db --check
.\.venv\Scripts\python.exe backend/scripts/migrate_004_poi_image_credit.py --database backend/data/saigon_stories.db --backup backups/before-migration-004.db
```

**DB ở schema 4 (sau migration 004, trước nhật ký thao tác Admin)** phải chạy migration 005 một lần, nếu không API từ chối khởi động. Dừng API trước, sao lưu rồi nâng cấp:

```powershell
.\.venv\Scripts\python.exe backend/scripts/migrate_005_admin_audit_log.py --database backend/data/saigon_stories.db --check
.\.venv\Scripts\python.exe backend/scripts/migrate_005_admin_audit_log.py --database backend/data/saigon_stories.db --backup backups/before-migration-005.db
```

DB schema 2 phải chạy 004 rồi mới chạy 005. Máy demo nào có DB chính riêng (Git bỏ qua) cũng cần làm bước này.

Ảnh tải lên lưu ở `storage/uploads/pois/` (Git bỏ qua; đổi thư mục gốc bằng biến `SAIGON_UPLOADS`); khi chuyển DB sang máy khác, chép kèm thư mục này. API không tự init/seed/migrate. Retention dọn thống kê ngoài cửa sổ 30 ngày khi startup và mỗi 00:00 Việt Nam. Giữ bản sao lưu trước khi chạy. Health chỉ xác nhận tiến trình; kiểm tra thêm `/api/v1/categories` và `/api/v1/pois`.

Chạy Admin web:
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm.cmd --prefix apps/admin-web run dev -- --strictPort --configLoader runner
```
Chạy Guest web:
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd --prefix apps/guest-web run dev -- --strictPort --configLoader runner
```

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
$env:EXPO_PUBLIC_USE_MOCK = 'false'
$env:EXPO_PUBLIC_API_STYLE = 'v1'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.31:8000/api' # thay bằng IP LAN hiện tại
Set-Location apps/mobile
npx.cmd expo start --clear --lan
```

Mobile và Guest mặc định gọi API thật, kể cả khi thiếu `.env`; chỉ dùng mock nếu đặt rõ biến tương ứng bằng `true`. `.env.example` đã chọn `false`. Khởi động lại Expo/Vite sau khi đổi cấu hình. Mobile tự nhận host Expo nếu để trống API URL; localhost trên điện thoại là điện thoại. Mock khóa Đồng ý thống kê và không chứng minh UC12 phía server. Không tự chuyển sang mock khi lỗi API.

## Cài dependency khi cần

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm.cmd --prefix apps/admin-web ci
npm.cmd --prefix apps/guest-web ci
npm.cmd --prefix apps/mobile ci
```

Nếu clone mới, tạo `.venv` bằng `python -m venv .venv` trước. DB chính không có trong Git: phục hồi snapshot riêng theo [hướng dẫn sao lưu](docs/deployment/backup-restore.md). Chỉ init/seed khi chủ động tạo DB thử nghiệm mới; không chạy trên DB chính. Cấu trúc ở [CAU_TRUC_DU_AN.md](CAU_TRUC_DU_AN.md).

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
