# Guest web – Saigon Stories

Ứng dụng React riêng cho khách tại `apps/guest-web`; Admin chạy từ `apps/admin-web`. Public API theo [hợp đồng chung](../../docs/API_CONTRACT.md): `/api/v1`, danh sách `items`, danh sách POI có `narration_locales` và chi tiết có `narrations`.

## Chạy trên Windows 11 / PowerShell

Cần Node.js 22.12+ (đã thử 22.22.0), npm và backend khi dùng dữ liệu thật; không dùng Docker. Các lệnh bắt đầu từ gốc repository.

```powershell
Set-Location apps/guest-web
npm.cmd ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
npm.cmd run dev
```

Vite chạy cổng 5173 và proxy `/api` về `http://127.0.0.1:8000`. Admin mặc định 5174. Hai web độc lập, cần cài dependency riêng. Nếu máy chưa nhận node/npm, cài Node hoặc thêm thư mục portable vào PATH cho cửa sổ hiện tại.

## Chọn mock hoặc API thật

Biến môi trường được Vite đọc khi khởi động/build. Dừng Vite bằng Ctrl+C trước khi đổi. Ví dụ tại `apps/guest-web`:

```powershell
# Dữ liệu giả lập; giao diện hiện thông báo nhận biết, không gọi public API.
$env:VITE_USE_MOCK = 'true'
npm.cmd run dev
```

```powershell
# API thật; cần backend đã chạy cổng 8000 ở PowerShell khác.
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev
```

Biến trong cửa sổ PowerShell có ưu tiên cao hơn .env. Để trở lại .env, dùng `Remove-Item Env:VITE_USE_MOCK -ErrorAction SilentlyContinue` và tương tự cho VITE_API_BASE_URL, rồi chạy lại Vite. Mặc định mock khi không đặt false; không tự fallback sang mock nếu API thật lỗi. VITE_API_BASE_URL bao gồm prefix phiên bản (không chỉ /api). Khi dùng URL tuyệt đối khác origin, backend phải có CORS phù hợp; cấu hình mặc định dùng proxy cùng origin.

Mock trả danh sách mảng cho UI như adapter API thật, có cùng trường tóm tắt; chỉ chi tiết kèm bài. Khi chạy dev, console trình duyệt cũng ghi Data source: mock hoặc API kèm base URL để người phát triển xác nhận chế độ. Kết quả mock không chứng minh backend/SQLite hoạt động.

Seed hiện là draft, API thật có thể trả `items:[]` và UI hiện trạng thái rỗng. Không công bố dữ liệu nháp để thử. Kiểm thử tự tạo database và POI published riêng.

## Ngôn ngữ và chức năng đang phát triển

UI có VI/EN, lưu lựa chọn tại localStorage riêng `saigon.guest.ui-language`, cập nhật html lang; không thay locale thuyết minh đang chọn khi đổi UI. Danh mục dùng `name` cho tiếng Việt và `name_en` cho tiếng Anh; nếu dữ liệu cũ chưa có tên tiếng Anh thì hiển thị tên tiếng Việt. Tên địa điểm và bài lấy nguyên từ dữ liệu. Danh sách locale bài theo dữ liệu, có thể hơn VI/EN; không tạo bản dịch thiếu.

Bản đồ, nghe TTS và consent/thống kê còn chờ tích hợp. Trang riêng tư ghi rõ trạng thái này; guest web chưa gửi thống kê và chưa cam kết lịch lưu/xóa dữ liệu đang vận hành.

## Kiểm thử

```powershell
# Tại apps/guest-web
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

Test đơn vị dùng Node test runner; Playwright là dependency phát triển cho browser test. Browser test dùng Microsoft Edge đã cài trên Windows và Python trong `.venv\Scripts\python.exe` ở gốc repo (cần `backend/requirements-dev.txt`). Có thể chỉ định đường Python khác bằng `$env:SAIGON_TEST_PYTHON = 'C:\duong-dan\python.exe'`.

Playwright tự chạy backend tại 18082 và hai Vite tại 18173 (mock), 18174 (thật), không dùng lại server đang chạy. Ba cổng cần trống. Fixture dùng TemporaryDirectory, không đọc database của người phát triển, có published/draft/hidden và bài VI/EN/FR chỉ phục vụ test. Test bao gồm response thật, tìm/lọc, rỗng, lỗi mạng/thử lại, 404, locale và độc lập ngôn ngữ UI. Không dùng fixture làm dữ liệu vận hành.

Build tĩnh cần máy chủ web reverse proxy `/api` về backend và fallback SPA cho route chi tiết; `vite preview` không thay thế cấu hình triển khai.
