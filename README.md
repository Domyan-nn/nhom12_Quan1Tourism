# Saigon Stories – Quận 1 Tourism

Đồ án ứng dụng khám phá và thuyết minh du lịch Quận 1. Khách sử dụng web hoặc mobile; Admin quản lý nội dung và xem thống kê trên web.

## Trạng thái

Repository có SQLite, seed dữ liệu nháp, FastAPI cho đăng nhập Admin, danh mục và địa điểm công khai, cùng web React tối thiểu cho khách và Admin. Mobile, GPS, bản đồ, TTS, thống kê và quản trị địa điểm chưa triển khai. Xem [hướng dẫn PowerShell](backend/README.md), [nội dung mẫu](backend/scripts/README.md), [hợp đồng API](docs/analysis-design/api-design.md) và [kết quả kiểm thử](docs/testing/test-results.md).

## Chạy thử trên Windows 11

Cần Python 3.12, Node.js 20.19+ hoặc 22.12+ và npm. Các lệnh chạy từ gốc repo trong PowerShell, không cần Docker. Chọn tên database **mới**; không dùng hay xóa database hiện có:

Trước khi chạy phần web, kiểm tra `node --version` và `npm.cmd --version`. Nếu PowerShell không nhận lệnh, cài Node.js LTS từ [nodejs.org](https://nodejs.org/) rồi mở lại PowerShell; hoặc nếu đã có bản Node portable, thêm thư mục chứa `node.exe` và `npm.cmd` vào `PATH` cho cửa sổ hiện tại: `$env:Path = 'ĐƯỜNG_DẪN_TỚI_THƯ_MỤC_NODE;' + $env:Path`. Thay phần đường dẫn bằng vị trí thực tế, sau đó kiểm tra lại hai lệnh trên. Thay đổi này chỉ có hiệu lực trong cửa sổ PowerShell hiện tại.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
$db = 'backend/data/demo-wbs-new.db'
if (Test-Path -LiteralPath $db) { throw 'Database đã tồn tại: chọn tên mới' }
.\.venv\Scripts\python.exe backend/scripts/init_db.py --database $db
.\.venv\Scripts\python.exe backend/scripts/seed_db.py --database $db --username demo-admin
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $db).Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Nhập mật khẩu demo riêng tại lời nhắc ẩn; không đặt mật khẩu trong lệnh hoặc Git. Mở PowerShell thứ hai tại gốc repo:

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

Mở URL Vite hiển thị trong terminal. Proxy phát triển chuyển `/api` tới `127.0.0.1:8000`; cả hai tiến trình cần chạy cùng máy. Đăng nhập bằng tên và mật khẩu đã seed. Token chỉ ở bộ nhớ trang, mất khi tải lại; đăng xuất gọi API thu hồi. Chuyển ngôn ngữ giao diện không đổi ngôn ngữ bài đang chọn. Dữ liệu seed đều là `draft`, nên trang khách ban đầu trống; không tự công bố dữ liệu chưa kiểm duyệt. Test API sử dụng dữ liệu `published` riêng trong database tạm.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
cd web
npm.cmd run build
```

Đoạn lệnh trên bắt đầu từ gốc repo; nếu đang ở `web`, chạy `npm.cmd run build` trực tiếp. Build tĩnh cần máy chủ web cấu hình chuyển tiếp `/api` về FastAPI; proxy Vite chỉ dành cho phát triển. Phiên bearer trong bộ nhớ vẫn có nguy cơ bị mã độc/XSS đọc, chưa có rate limiting, chính sách triển khai HTTPS, dọn phiên hay CORS cho các origin độc lập: chưa sẵn sàng production. Các địa chỉ, tọa độ, nội dung và quyền ảnh mẫu chưa xác minh; xem [danh sách](backend/scripts/README.md).

Tài liệu hiện tại: [PRD Saigon Stories SQLite](PRD_Saigon_Stories_Quan1_SQLite.docx). Nhóm cần đối chiếu thêm quy định đồ án cuối khóa của trường và giảng viên.

Xem [mô tả từng thư mục và tệp](CAU_TRUC_DU_AN.md) để biết nơi đặt code và tài liệu.

## Cấu trúc dự án

| Thư mục | Trách nhiệm |
| --- | --- |
| `backend/` | FastAPI, nghiệp vụ, xác thực, migration và kiểm thử API |
| `web/` | React cho khách và Admin |
| `mobile/` | React Native/Expo cho khách, GPS và TTS |
| `docs/` | Yêu cầu, thiết kế, kiểm thử, triển khai và báo cáo |
| `backend/data/` | Tệp SQLite cục bộ khi chạy; không đưa dữ liệu vận hành lên Git |
| `storage/uploads/` | Vị trí dự kiến cho ảnh tải lên; không đưa dữ liệu vận hành lên Git |

Theo thiết kế dự kiến, các ứng dụng dùng chung FastAPI; backend truy cập SQLite cục bộ. GPS tự phát được xử lý trên mobile trong khi ứng dụng hiển thị. Bản đồ và TTS phụ thuộc dịch vụ hoặc thiết bị.

Tệp database dự kiến đặt tại `backend/data/saigon_stories.db`. Kết nối nằm trong `backend/app/db/`, model trong `backend/app/models/`, migration trong `backend/migrations/`, còn script tạo dữ liệu mẫu đặt trong `backend/scripts/`.

## Bắt đầu phát triển

1. Đọc PRD và [thiết kế tổng quan](docs/analysis-design/architecture.md).
2. Thống nhất mô hình dữ liệu, hợp đồng API và công cụ phát triển.
3. Cài đặt backend, migration, dữ liệu mẫu; sau đó phát triển web và mobile.
4. Cập nhật [hướng dẫn cài đặt](docs/deployment/setup.md) bằng lệnh thực tế khi mỗi thành phần được triển khai.
5. Ghi kết quả vào [tài liệu kiểm thử](docs/testing/test-results.md), kèm phiên bản và minh chứng.

Các tệp `.gitkeep` chỉ giữ chỗ cho thư mục chưa có nội dung; xóa chúng khi có mã nguồn hoặc tài liệu thực tế.
