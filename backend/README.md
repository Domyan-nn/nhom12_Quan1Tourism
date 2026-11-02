# Backend

Hiện có FastAPI, endpoint tình trạng, đăng nhập/đăng xuất Admin, quản lý danh mục và đọc địa điểm công khai, cùng migration, seed và kiểm thử SQLite. Web React tối thiểu đã có mã nguồn; quản trị địa điểm và thống kê chưa triển khai. Xem hướng dẫn web ở README gốc.

Demo hiện có dùng `backend/data/preview-thu-nghiem-5826e873.db`, bằng cách đặt `SAIGON_DATABASE` như trong [hướng dẫn cài đặt](../docs/deployment/setup.md). Database `backend/data/saigon_stories.db` dành cho dữ liệu chính và không dùng cho demo. Preview có dữ liệu thử nghiệm đã published, không phải nội dung đã kiểm duyệt.

Chạy demo từ gốc repo bằng `.\.venv\Scripts\python.exe backend/scripts/start_demo.py`. Script chỉ định database preview cho tiến trình backend. Backend kiểm tra các cột danh mục khi khởi động, báo đường dẫn và dừng nếu database thiếu hoặc chưa nâng cấp; không tự migrate.

Database mới do `init_db.py` tạo đã có cột danh mục tiếng Anh. Với database cũ, dừng API và mọi tiến trình ghi, sau đó kiểm tra và nâng cấp một lần bằng script dưới đây; đường dẫn backup phải chưa tồn tại:

```powershell
.\.venv\Scripts\python.exe backend/scripts/prepare_category_bilingual.py --database <database> --check
.\.venv\Scripts\python.exe backend/scripts/prepare_category_bilingual.py --database <database> --backup <backup-moi>
```

Migration giữ nguyên ID và tên cũ, không tự dịch các danh mục sẵn có. Admin cần bổ sung tên tiếng Anh cho từng danh mục; trang khách dùng tên tiếng Việt khi bản dịch còn thiếu. Seed chỉ tạo bản dịch cho các dòng mẫu mới, không ghi đè dòng hiện có. Chi tiết ở [hướng dẫn danh mục](../docs/analysis-design/category-bilingual-preparation.md).

- `app/db/`: code kết nối SQLite; `app/models/`: định nghĩa các bảng.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: script khởi tạo và [dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: vị trí dự kiến cho tệp SQLite cục bộ; không đưa dữ liệu vận hành lên Git.

Sau khi triển khai, bổ sung cách sao lưu và phục hồi đã được kiểm chứng.

## Khởi tạo database

Các lệnh sau chạy ở thư mục gốc repo bằng PowerShell trên Windows. Cần Python 3.12 và module chuẩn `sqlite3`. Nếu `python` không chạy, cài Python 3.12 và bật PATH hoặc thay `python` bằng đường dẫn Python 3.12 trên máy.

```powershell
python --version
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
```

Không cần kích hoạt môi trường. `requirements.txt` gồm FastAPI và Uvicorn để chạy API; `requirements-dev.txt` cài thêm HTTPX cho `TestClient`. Các script SQLite riêng lẻ chỉ dùng thư viện chuẩn. Không có Docker.

**Chọn một file mới.** Repo có thể đã có `backend/data/saigon_stories.db`; không xóa hoặc ghi đè file đó. Ví dụ sau tạo database thử nghiệm riêng, và dừng nếu file đã tồn tại (chọn tên mới khi chạy lại):

```powershell
$db = "backend/data/demo-wbs.db"
if (Test-Path -LiteralPath $db) { throw "Database đã tồn tại; hãy chọn tên mới: $db" }
.\.venv\Scripts\python.exe backend/scripts/init_db.py --database $db
.\.venv\Scripts\python.exe backend/scripts/seed_db.py --database $db --username demo-admin
```

Nhập mật khẩu mới tại lời nhắc ẩn; không nhập mật khẩu trong lệnh. Đọc [giới hạn và quy tắc seed](scripts/README.md). `init_db.py` từ chối file đã có bảng/view. Seed không tự khởi tạo database. Khi chạy seed lại, dùng cùng `$db`, tên tài khoản và mật khẩu tại lời nhắc; tài khoản đã có không đổi mật khẩu.

Kiểm tra bằng Python, không cần CLI SQLite:

```powershell
.\.venv\Scripts\python.exe -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); print('Bang:', [r[1] for r in c.execute('pragma table_list') if r[2] == 'table' and not r[1].startswith('sqlite_')]); [print(t, c.execute('select count(*) from '+t).fetchone()[0]) for t in ('categories','pois','poi_narrations','admin_accounts')]; print('Trang thai:', c.execute('select status,count(*) from pois group by status').fetchall()); c.close()" $db
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Với database trống vừa seed, số lượng dự kiến lần lượt là 2, 5, 6, 1; toàn bộ POI là `draft`. Kiểm thử tạo database tạm, không sử dụng database cá nhân. Module `app/db/connection.py` mở file đã tồn tại, bật `PRAGMA foreign_keys` mỗi kết nối; `get_connection()` là dependency đồng bộ có thể dùng trong FastAPI sau này, mỗi request dùng kết nối riêng, không dùng đồng thời. Người gọi kết nối trực tiếp cần tự commit/rollback và đóng; context manager của `sqlite3.Connection` chỉ quản lý transaction, không đóng kết nối.

## Chạy API và kiểm tra

Với `$db` đã khởi tạo và seed ở trên, mở một PowerShell tại thư mục gốc:

```powershell
$db = "backend/data/demo-wbs.db"
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $db).Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Mở PowerShell khác và chạy `Invoke-RestMethod http://127.0.0.1:8000/api/v1/health`: kỳ vọng `status: ok`. Health chỉ xác nhận tiến trình API, không kiểm tra database. Mở `http://127.0.0.1:8000/docs` để xem các route và thử đăng nhập bằng tài khoản đã seed; nhập mật khẩu trong biểu mẫu, không gõ vào lệnh hay commit. Nút Authorize dùng token trả về; đăng xuất để thu hồi token khi thử xong. Nhấn Ctrl+C ở cửa sổ server để dừng.

Nếu không đặt `SAIGON_DATABASE`, API dùng `backend/data/saigon_stories.db` hiện có; API không tạo database. Kiểm tra đúng đường dẫn trước khi chạy vì các API sẽ ghi vào file được chọn. Tests dùng database tạm qua dependency override, không dùng database cá nhân:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Token là bearer ngẫu nhiên, chỉ hash được lưu, hết hạn sau 8 giờ và bị thu hồi khi đăng xuất; mỗi request quản trị đều kiểm tra phiên và trạng thái Admin. Web giữ token trong bộ nhớ và cần đăng nhập lại khi tải trang. Chưa có giới hạn đăng nhập/rate limiting, dọn phiên hết hạn hoặc CORS cho origin độc lập; chưa phù hợp triển khai production. Không gửi token qua URL, dùng HTTPS khi truy cập từ mạng công khai. Chưa có đăng ký Admin công khai. Xem [các route đã triển khai và hợp đồng dự kiến](../docs/analysis-design/api-design.md).

File `*.db`, `*.sqlite`, `*.sqlite3` và các file SQLite phụ được `.gitignore` bỏ qua; không thêm database hoặc bí mật lên Git. Kiểm tra file tên khác hoặc file đã tracked trước khi commit.

## Nâng cấp schema thống kê

Database mới: `init_db.py` chạy migration lịch sử `001_initial.sql` rồi `002_analytics_constraints.sql`, đặt `PRAGMA user_version=2`. `backend/data/schema_analytics.sql` chỉ còn truy vấn tham chiếu, không phải script khởi tạo/nâng cấp. `CREATE TABLE IF NOT EXISTS` không bổ sung CHECK cho bảng đã tồn tại.

Database cũ: **dừng backend và các tiến trình ghi trước khi thao tác**. Chọn đúng file, chạy kiểm tra trên bản sao trong bộ nhớ; script mở file nguồn ở chế độ chỉ đọc cho `--check`, không tạo file nguồn nếu thiếu. Ví dụ từ gốc repo:

```powershell
$analyticsDb = (Resolve-Path -LiteralPath 'backend/data/saigon_stories.db').Path
.\.venv\Scripts\python.exe backend/scripts/migrate_db.py --database $analyticsDb --check
if ($LASTEXITCODE -ne 0) { throw 'Dữ liệu hoặc schema chưa phù hợp; dừng nâng cấp' }
```

Sau khi review kết quả và ràng buộc dưới đây, áp dụng thủ công với tên backup mới. Script dùng SQLite backup API và từ chối backup đã tồn tại; không ghi đè bản sao lưu:

```powershell
$analyticsBackup = Join-Path (Split-Path -Parent $analyticsDb) ('pre-analytics-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/migrate_db.py --database $analyticsDb --backup $analyticsBackup
if ($LASTEXITCODE -ne 0) { throw 'Nâng cấp thất bại; giữ nguyên dữ liệu và kiểm tra thông báo' }
```

Không chạy file SQL 002 trực tiếp. Runner dùng BEGIN IMMEDIATE, tắt khóa ngoại trước giao dịch để rebuild hai bảng, kiểm tra dữ liệu khi copy trước khi bỏ bảng cũ, kiểm tra foreign_key_check/integrity_check trước commit và bật lại khóa ngoại. Mọi lỗi rollback cả schema và dữ liệu. Các bảng Admin/danh mục/POI không bị rebuild. Chạy lại nâng cấp vẫn bảo toàn dòng dữ liệu, nhưng mỗi lần áp dụng cần một backup mới.

Ràng buộc chuẩn:

- Session ID và event ID là UUID v4 chuẩn chữ thường; không chỉ kiểm tra độ dài 36.
- consent_granted là INTEGER 0/1, mặc định 1.
- Thời gian UTC hợp lệ đủ 24 ký tự `YYYY-MM-DDTHH:MM:SS.mmmZ`; last_seen_at không trước created_at. Định dạng này chỉ áp dụng hai bảng analytics, không đổi thời gian Admin.
- visit_events.session_id là NULL hoặc tham chiếu phiên có sẵn, ON DELETE SET NULL.
- Ba chỉ mục chuẩn: idx_anonymous_sessions_last_seen_at, idx_visit_events_session_id, idx_visit_events_started_at. Hai tên chỉ mục cũ của schema riêng được thay bằng tên chuẩn.

UUID sai phiên bản/viết hoa, thời gian offset hoặc thiếu phần mili giây, ngày không hợp lệ, consent khác 0/1 và orphan FK đều làm nâng cấp dừng. **Không tự sửa/xóa dữ liệu cũ.** Người quản lý dữ liệu cần xác định cách xử lý rồi kiểm tra lại. Script cũng dừng khi có cột/kiểu/khóa chính khác dự kiến, version không biết, chỉ mục tùy biến, trigger/view hoặc bảng khác phụ thuộc analytics; cần migration riêng cho các trường hợp đó.

Bản backup chứa database trước nâng cấp. Nếu cần phục hồi, dừng toàn bộ tiến trình truy cập SQLite, giữ riêng file hiện tại cùng các file WAL/SHM nếu có và phục hồi vào một file mới bằng SQLite backup API trước khi đổi SAIGON_DATABASE; không chép đè database đang mở. Chưa chạy nâng cấp trên database cá nhân trong đợt sửa này; các ca mới/cũ/rollback chỉ chạy bằng database tạm.

Schema không tự thực hiện heartbeat, rút đồng ý, lịch dọn 30 ngày hoặc dashboard. WBS-08/WBS-09 vẫn cần API và kiểm thử nghiệp vụ riêng. Hợp đồng thống nhất ở [API_CONTRACT.md](../docs/API_CONTRACT.md).
