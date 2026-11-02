# Saigon Stories – Quận 1 Tourism

Đồ án ứng dụng khám phá và thuyết minh du lịch Quận 1. Khách sử dụng web hoặc mobile; Admin quản lý nội dung và xem thống kê trên web.

## Trạng thái

Repository có SQLite, seed dữ liệu nháp, FastAPI cho đăng nhập Admin, danh mục và địa điểm công khai; ứng dụng React Admin và web khách được tách riêng. Guest web hỗ trợ mock và API thật `/api/v1`, có UI VI/EN độc lập với ngôn ngữ thuyết minh. Mobile đã có mã Expo nhưng tích hợp và thiết bị cần kiểm thử riêng. Bản đồ/TTS web, API thống kê, dashboard và quản trị địa điểm còn chờ triển khai. Xem [hướng dẫn Windows](docs/deployment/setup.md), [nội dung mẫu](backend/scripts/README.md), [hợp đồng API](docs/API_CONTRACT.md) và [kết quả kiểm thử](docs/testing/test-results.md).

## Chạy thử trên Windows 11

Có thể dùng database demo hiện có `backend/data/preview-thu-nghiem-5826e873.db` mà không khởi tạo hoặc seed lại. Từ gốc repo, sau khi cài các phụ thuộc backend, chạy:

```powershell
.\.venv\Scripts\python.exe backend/scripts/start_demo.py
```

Chạy Admin và guest web theo hướng dẫn bên dưới; đặt `VITE_USE_MOCK=false` cho guest web để hai giao diện cùng dùng API này. Database `backend/data/saigon_stories.db` dành cho dữ liệu chính; không dùng trong demo. Hai địa điểm `published` trong preview là dữ liệu thử nghiệm, không phải nội dung đã kiểm duyệt.

Khi khởi động, backend kiểm tra bảng danh mục của database được chọn. Nếu database chưa có cột song ngữ, backend dừng và thông báo đường dẫn cùng hướng dẫn nâng cấp; không tự thay đổi dữ liệu.

Cần Python 3.12, Node.js 22.12+ và npm. Các lệnh chạy từ gốc repo trong PowerShell, không cần Docker. Chọn tên database **mới**; không dùng hay xóa database hiện có:

Trước khi chạy phần web, kiểm tra `node --version` và `npm.cmd --version`. Nếu PowerShell không nhận lệnh, cài Node.js LTS từ [nodejs.org](https://nodejs.org/) rồi mở lại PowerShell; hoặc nếu đã có bản Node portable, thêm thư mục chứa `node.exe` và `npm.cmd` vào `PATH` cho cửa sổ hiện tại: `$env:Path = 'ĐƯỜNG_DẪN_TỚI_THƯ_MỤC_NODE;' + $env:Path`. Thay phần đường dẫn bằng vị trí thực tế, sau đó kiểm tra lại hai lệnh trên. Thay đổi này chỉ có hiệu lực trong cửa sổ PowerShell hiện tại.

```powershell
if (-not (Test-Path -LiteralPath .venv)) { python -m venv .venv }
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
cd apps/admin-web
npm.cmd ci
npm.cmd run dev
```

Mở URL Vite hiển thị trong terminal (mặc định `http://localhost:5174`) để dùng Admin. Proxy phát triển chuyển `/api` tới `127.0.0.1:8000`; cả hai tiến trình cần chạy cùng máy. Đăng nhập bằng tên và mật khẩu đã seed. Token chỉ ở bộ nhớ trang, mất khi tải lại; đăng xuất gọi API thu hồi. Dữ liệu seed đều là `draft`; không tự công bố dữ liệu chưa kiểm duyệt. Test API sử dụng dữ liệu `published` riêng trong database tạm.

Web khách là ứng dụng riêng trong [apps/guest-web](apps/guest-web/README.md), chạy mặc định tại cổng 5173. Đặt `VITE_USE_MOCK=false` và `VITE_API_BASE_URL=/api/v1`, rồi khởi động lại Vite để gọi backend thật. Mặc định dùng mock có thông báo trên trang; lỗi API thật không chuyển sang mock. Seed vẫn là draft nên danh sách công khai có thể rỗng. Xem [các lệnh đầy đủ](docs/deployment/setup.md).

Mở PowerShell khác từ gốc repo để chạy guest web:

```powershell
cd apps/guest-web
npm.cmd ci
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev
```

Mobile có hướng dẫn riêng tại [apps/mobile](apps/mobile/README.md). Từ gốc repo, chạy trong cửa sổ riêng:

```powershell
cd apps/mobile
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
npx.cmd expo start
```

Mobile mặc định dùng mock (`EXPO_PUBLIC_USE_MOCK=true`). Muốn gọi API thật, đặt false và cấu hình `EXPO_PUBLIC_API_BASE_URL` kết thúc bằng `/api` trong `.env`, rồi khởi động lại Expo. Điện thoại thật cần địa chỉ LAN phù hợp và backend lắng nghe trên `0.0.0.0`; `localhost` trên điện thoại là chính điện thoại. Kiểm thử thiết bị thật vẫn chưa được thực hiện.

Database mới được init qua migration 001, 002 và bước bổ sung cột danh mục song ngữ. Database đã có cần dùng script nâng cấp riêng có kiểm tra dữ liệu và backup; xem [backend README](backend/README.md). Không chạy lại init hoặc schema tham chiếu để nâng cấp.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
cd apps/admin-web
npm.cmd run build
```

Đoạn lệnh trên bắt đầu từ gốc repo; nếu đang ở `apps/admin-web`, chạy `npm.cmd run build` trực tiếp. Build tĩnh cần máy chủ web cấu hình chuyển tiếp `/api` về FastAPI; proxy Vite chỉ dành cho phát triển. Phiên bearer trong bộ nhớ vẫn có nguy cơ bị mã độc/XSS đọc, chưa có rate limiting, chính sách triển khai HTTPS, dọn phiên hay CORS cho các origin độc lập: chưa sẵn sàng production. Các địa chỉ, tọa độ, nội dung và quyền ảnh mẫu chưa xác minh; xem [danh sách](backend/scripts/README.md).

Tài liệu hiện tại: [PRD Saigon Stories SQLite](PRD_Saigon_Stories_Quan1_SQLite.docx). Nhóm cần đối chiếu thêm quy định đồ án cuối khóa của trường và giảng viên.

Xem [mô tả từng thư mục và tệp](CAU_TRUC_DU_AN.md) để biết nơi đặt code và tài liệu.

## Cấu trúc dự án

| Thư mục | Trách nhiệm |
| --- | --- |
| `backend/` | FastAPI, nghiệp vụ, xác thực, migration và kiểm thử API |
| `apps/admin-web/` | Ứng dụng React Admin, cổng Vite mặc định 5174 |
| `apps/guest-web/` | Ứng dụng React dành cho khách, cổng Vite mặc định 5173 |
| `apps/mobile/` | React Native/Expo cho khách, GPS và TTS |
| `docs/` | Yêu cầu, thiết kế, kiểm thử, triển khai và báo cáo |
| `docs/mobile/` | Tài liệu, sơ đồ và checklist thiết bị của mobile |
| `backend/data/` | Tệp SQLite cục bộ khi chạy; không đưa dữ liệu vận hành lên Git |
| `storage/uploads/` | Vị trí dự kiến cho ảnh tải lên; không đưa dữ liệu vận hành lên Git |

Theo thiết kế dự kiến, các ứng dụng dùng chung FastAPI; backend truy cập SQLite cục bộ. GPS tự phát được xử lý trên mobile trong khi ứng dụng hiển thị. Bản đồ và TTS phụ thuộc dịch vụ hoặc thiết bị.

Tệp database dự kiến đặt tại `backend/data/saigon_stories.db`. Kết nối nằm trong `backend/app/db/`, model trong `backend/app/models/`, migration trong `backend/migrations/`, còn script tạo dữ liệu mẫu đặt trong `backend/scripts/`.

## Ánh xạ khi chuyển sang apps

| Đường dẫn cũ | Đường dẫn mới |
| --- | --- |
| `web/guest-web/` | `apps/guest-web/` |
| Phần Admin còn lại trong `web/` | `apps/admin-web/` |
| `mobile/mobile/` | `apps/mobile/` |
| `mobile/docs/` | `docs/mobile/` |
| `mobile/README.md` | `docs/mobile/README.md` |
| Các tệp khung `.gitkeep` dưới `mobile/src`, `mobile/assets`, `mobile/tests` | Gộp vào thư mục tương ứng của `apps/mobile/` |

Backend, docs hiện có và storage giữ vị trí. Mỗi ứng dụng vẫn có package.json, lockfile, dependency và lệnh chạy độc lập; không có npm workspace chung ở gốc. Các báo cáo kiểm thử lịch sử giữ tên đường dẫn ở thời điểm kiểm tra, còn liên kết trỏ đến vị trí mới.

Sau khi nhóm merge, An và Thuận cần lưu công việc đang làm, đồng bộ nhánh, mở terminal tại đường dẫn mới và chạy `npm.cmd ci` trong ứng dụng phụ trách. Giữ `.env` cá nhân tại đúng thư mục ứng dụng; file này, database, node_modules và output build không được đưa vào Git. Không dùng tiếp tiến trình Vite/Expo khởi động từ đường dẫn cũ.

Các lệnh kiểm tra từ gốc repo:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests
npm.cmd --prefix apps/admin-web run build
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/guest-web run build
npm.cmd --prefix apps/guest-web run test:browser
npm.cmd --prefix apps/mobile test -- --runInBand
```

Kiểm tra cấu hình và bundle mobile từ `apps/mobile`: `npx.cmd expo config --type public`, `npx.cmd expo export --platform all --output-dir <THU-MUC-OUTPUT-MOI>`. Kết quả trước/sau và giới hạn kiểm thử nằm trong [báo cáo tái cấu trúc](docs/testing/monorepo-restructure-2026-11-02.md).

## Bắt đầu phát triển

1. Đọc PRD và [thiết kế tổng quan](docs/analysis-design/architecture.md).
2. Thống nhất mô hình dữ liệu, hợp đồng API và công cụ phát triển.
3. Cài đặt backend, migration, dữ liệu mẫu; sau đó phát triển web và mobile.
4. Cập nhật [hướng dẫn cài đặt](docs/deployment/setup.md) bằng lệnh thực tế khi mỗi thành phần được triển khai.
5. Ghi kết quả vào [tài liệu kiểm thử](docs/testing/test-results.md), kèm phiên bản và minh chứng.

Các tệp `.gitkeep` chỉ giữ chỗ cho thư mục chưa có nội dung; xóa chúng khi có mã nguồn hoặc tài liệu thực tế.
