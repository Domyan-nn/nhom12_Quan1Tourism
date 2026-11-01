# Backend

Hiện có migration SQLite, script khởi tạo, seed và kiểm thử; ứng dụng FastAPI, API và đăng nhập chưa triển khai. Các nhóm `api`, `services`, `models` và `schemas` vẫn là khung dự kiến.

- `app/db/`: code kết nối SQLite; `app/models/`: định nghĩa các bảng.
- `migrations/`: lịch sử thay đổi cấu trúc cơ sở dữ liệu.
- `scripts/`: script khởi tạo và [dữ liệu mẫu](scripts/README.md).
- `data/saigon_stories.db`: vị trí dự kiến cho tệp SQLite cục bộ; không đưa dữ liệu vận hành lên Git.

Sau khi triển khai, bổ sung cách sao lưu và phục hồi đã được kiểm chứng.

## Khởi tạo database

Các lệnh sau chạy ở thư mục gốc repo bằng PowerShell trên Windows. Cần Python 3.12 và module chuẩn `sqlite3`; các bước này không cần cài thư viện ngoài. Nếu `python` không chạy, cài Python 3.12 và bật PATH hoặc thay `python` bằng đường dẫn Python 3.12 trên máy.

```powershell
python --version
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe --version
```

Không cần kích hoạt môi trường hoặc chạy `pip install` cho các script hiện tại. Nếu sau này backend có danh sách phụ thuộc, cài theo hướng dẫn của phiên bản đó. Không có Docker.

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

File `*.db`, `*.sqlite`, `*.sqlite3` và các file SQLite phụ được `.gitignore` bỏ qua; không thêm database hoặc bí mật lên Git. Kiểm tra file tên khác hoặc file đã tracked trước khi commit.
