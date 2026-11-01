# Backend

Hiện có FastAPI, endpoint tình trạng, đăng nhập/đăng xuất Admin, quản lý danh mục và đọc địa điểm công khai, cùng migration, seed và kiểm thử SQLite. Web React tối thiểu đã có mã nguồn; quản trị địa điểm và thống kê chưa triển khai. Xem hướng dẫn web ở README gốc.

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
