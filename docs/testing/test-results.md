# Kết quả kiểm thử

## Mobile SDK 58 và phản hồi kiểm thử thiết bị — 07/11/2026

Working tree sau nâng Expo lên **58.0.23**, React Native **0.88.1**, React **19.3.0**. Kiểm tra tự động: Expo Doctor **20/20 đạt**; Jest **116 đạt + 4 HTTP bỏ qua** khi chưa bật fixture riêng; bundle Android/iOS trả HTTP 200. Đây là kết quả kiểm tra kỹ thuật, không thay cho kiểm thử thiết bị.

Người dùng báo **bản đồ, quyền vị trí, GPS, TTS VI và EN đều hoạt động ổn trên mobile**. Lượt thử đang dùng dữ liệu giả lập: **chưa kiểm thử được đồng ý/rút đồng ý thống kê (UC12)** vì nút Đồng ý bị khóa trong chế độ mock. Đây là hành vi dự kiến của mock; cần chuyển sang API thật và khởi động lại Expo để kiểm thử luồng này. Chưa có thông tin thiết bị/OS, build, giọng và minh chứng; chưa xác nhận toàn bộ ca biên hoặc nghiệm thu toàn hệ thống. Chi tiết tại [phiếu kiểm thử mobile](../mobile/testing/mobile-field-test.md).

Các mục theo ngày bên dưới được giữ làm lịch sử.

## Kiểm tra nghiệm thu kỹ thuật trên `4723a49` — 06/11/2026

Backend **89/89**, guest **25 Node + 20 Vitest**, Edge **37 đạt + 1 chẩn đoán mạng bỏ qua**, mobile Jest + HTTP fixture **120/120**; tất cả các lượt được tính đều exit 0. Build Admin và guest thành công. Bản đồ web đã tải 12 tile thật qua nguồn dự phòng OpenStreetMap Deutschland và hiện 4 ghim API; 13/13 ca bản đồ trong Edge đạt. Bộ browser dùng bốn dịch vụ test riêng để tránh lỗi dừng server của cấu hình mặc định. Xem [biên bản kiểm tra và phần việc tiếp theo](acceptance-readiness-2026-11-06.md).

Kết quả này xác nhận phần tự động đã sẵn sàng cho bước demo và kiểm thử hiện trường. Mobile HTTP đã chạy lại trên phiên bản này bằng SQLite tạm; kiểm thử điện thoại, âm thanh/GPS thực tế và dữ liệu demo được duyệt vẫn chờ nhóm hoàn tất. Các mục dưới là kết quả lịch sử theo đúng phiên bản ghi tại từng mục.

## Bàn giao 06/11/2026, chuẩn bị demo 07/11

Nền `main` / `48a0908`, ban đầu sạch; kết quả áp dụng working tree chưa commit. Backend **89/89**, guest **25 Node + 20 Vitest**, browser **36 đạt + 1 OSM opt-in bỏ qua** (config tạm, dịch vụ riêng), mobile **120/120** khi bật fixture HTTP (mặc định **116 đạt + 4 HTTP bỏ qua**); các lượt cuối này đều exit 0. Build Admin/guest và Android export đạt. NFR08 HTTP thật **20/20 dưới 3 giây**; backup/restore kiểm tra bảy bảng trên SQLite tạm đạt. Cài sạch web từ cache npm đạt; backend venv mới chưa cài được offline vì thiếu distribution FastAPI.

OSM diagnostic riêng: fallback đạt, nhưng **0 tile thành công / 15 ERR_CONNECTION_REFUSED**; chưa đạt tải tile thật tại môi trường này. Chưa có điện thoại, âm thanh/GPS/native map thật, nội dung demo được duyệt, Word/sơ đồ/video hoàn chỉnh hoặc cài mới toàn hệ thống trên máy khác. Xem [báo cáo F01–F12/NFR01–NFR08, lệnh, giới hạn và manifest](integration-2026-11-06.md), [checklist demo](../deployment/demo-guide.md), [sao lưu/phục hồi](../deployment/backup-restore.md). Các kết quả bên dưới là lịch sử.

## Tích hợp tồn đọng đến 03/11, kiểm chứng ngày 04/11/2026

Bổ sung trước push theo yêu cầu người dùng: rebase phần tích hợp lên commit `aa0d2d7` mới của An, giữ UC09/UC10–UC11/Dashboard. Backend chạy lại **79/79**, guest **25 Node + 20 Vitest**, build Admin thành công; Playwright **31 ca chức năng đạt + 1 OSM opt-in skip**, exit 0. Các con số bên dưới ghi mốc kiểm chứng trước rebase; xem phần đầu báo cáo để biết cách ghép và kết quả mới.

Nền `main` / `97e1ad6`, Git ban đầu sạch, thay đổi chưa commit: backend unittest 69/69; pytest analytics 34/34 (các ca nằm trong unittest, không cộng hai lần); guest Node 25/25 + Vitest 20/20; Edge Playwright 32/32, exit 0, gồm 31 ca chức năng và 1 chẩn đoán OSM thật; mobile 85/85 với FastAPI/SQLite tạm, mặc định 83 pass + 2 HTTP skip. Build Admin/guest và export Android thành công. Tile OSM thật: 0 response thành công, 15 `net::ERR_CONNECTION_REFUSED`; diagnostic đạt kiểm tra fallback, không đạt tải tile. Âm thanh thật và điện thoại/emulator chưa kiểm thử. Xem [báo cáo, manifest file, Gate 2/Gate 3 và bàn giao](integration-2026-11-04.md). Các mục sau giữ làm lịch sử.

## Tích hợp Gate 2 ngày 03/11/2026

Nền `main` / `486ae4e`, working tree chưa commit: backend 60/60; pytest analytics 27/27 (trùng phạm vi unittest, không cộng thành 87 ca độc lập); guest Node 7/7 và Vitest 11/11; Playwright Edge 24/24, tiến trình thoát 0; mobile với API/SQLite tạm 69/69, mặc định 67 pass + 2 skip. Build Admin, guest và export Android thành công. Tile OSM thật bị `net::ERR_CONNECTION_REFUSED` tại môi trường kiểm tra; trạng thái lỗi và đường tiếp tục tra cứu vẫn hoạt động. Chưa có điện thoại/emulator để nghiệm thu native. Xem [báo cáo, lệnh, giới hạn và đề xuất WBS](gate2-integration-2026-11-03.md). Các báo cáo bên dưới giữ nguyên như lịch sử.

## Sửa tích hợp ngày 02/11/2026

Nền mã nguồn: main tại 3bf8256, đã đối chiếu GitHub trước khi sửa. Python 3.12.15, Node 22.22.0, Windows, Microsoft Edge headless. Tệp retest-2026-11-02.md là kết quả trước sửa và được giữ nguyên; bản bàn giao sau sửa tại [integration-fixes-2026-11-02.md](integration-fixes-2026-11-02.md).

| Kiểm tra thực tế | Kết quả | Giới hạn |
| --- | --- | --- |
| unittest backend | Đạt 24/24: 8 Admin, 6 database/seed, 2 public API, 8 migration | Chỉ dùng DB tạm; chưa áp dụng lên DB cá nhân |
| Node test runner guest | Đạt 4/4 ca | Fetch giả lập cho test adapter; bằng chứng API thật ở bộ backend/browser riêng |
| Playwright + Edge | Đạt 7/7 ca: mock và API thật, response/locale, tìm/lọc, rỗng, lỗi/thử lại, 404/draft/hidden, UI độc lập bài, trạng thái riêng tư | FastAPI thật + Vite, fixture published/draft/hidden và VI/EN/FR trong DB tạm; chưa xác nhận mọi trình duyệt/thiết bị |
| npm ci guest sạch | Đạt, lockfile có Playwright | Chạy trong bản sao source ở thư mục tạm vì môi trường hạn chế ghi vào node_modules trong workspace |
| Build guest | Đạt với Vite 8.3.5 | Source/lockfile sao chép từ workspace; output ở thư mục tạm |
| Build Admin | Đạt với Vite 7.3.7 | Dùng --configLoader runner và outDir tạm để tránh EPERM của môi trường |

Các ca/điều kiện ở [test-cases.md](test-cases.md). API analytics, dashboard, dọn retention, GPS/TTS và bản đồ không được triển khai hoặc đánh dấu hoàn tất trong đợt này. Không kiểm thử mobile, production hoặc nâng cấp database đang dùng. Các kết quả bên dưới là lịch sử, không thay cho kết quả mới này.

## Bổ sung ngày 01/11/2026

| Kiểm tra thực tế | Kết quả |
| --- | --- |
| Python 3.12.15, `python -m unittest discover -s backend/tests -v` | Đạt 15 test: 6 database, 8 Admin và 1 API công khai. Database tạm; gồm kiểm tra lọc, kết hợp tìm kiếm, Unicode và ẩn draft/hidden. |
| Node 22.22.0, `npm.cmd run build` | Đạt với React 19.3.1 và Vite 7.3.7; `npm ci` cũng đã cài thành công trong thư mục thử nghiệm sạch. |
| Edge headless, Vite + Uvicorn localhost | Đạt luồng tìm kiếm, chi tiết, chọn bài vi/en, đổi giao diện VI/EN giữ ngôn ngữ bài, đăng nhập, thêm/sửa/xóa danh mục và đăng xuất. Database thử nghiệm riêng có một bản ghi được đánh dấu published chỉ trong test. Không có lỗi JavaScript được ghi nhận. |

Giao diện chưa được kiểm thử thủ công trên nhiều trình duyệt/thiết bị, hoặc toàn bộ trạng thái lỗi và hết hạn phiên qua trình duyệt; các trường hợp token tương ứng đã được kiểm tra ở API. Việc nhập mật khẩu qua `getpass` của người dùng thật chưa kiểm tra tương tác. Kết quả build không xác nhận khả năng triển khai production.

Các kết quả lịch sử trước bổ sung trên cho thay đổi WBS-01/WBS-02 trong workspace, ngày 01/11/2026. Python 3.12.15 trên Windows; database dùng file tạm, không dùng database cá nhân. Chưa có commit để gắn phiên bản.

| Ca kiểm thử | Phiên bản | Môi trường / thiết bị | Ngày | Kết quả | Minh chứng / lỗi |
| --- | --- | --- | --- | --- | --- |
| `python -m unittest discover -s backend/tests -v` | Working tree | Python 3.12.15 / Windows | 01/11/2026 | Đạt: 6 test | Khởi tạo lại, kết nối/khóa ngoại, giới hạn tọa độ/bán kính, UNIQUE, RESTRICT/CASCADE, seed lặp và rollback xung đột; kiểm thử entrypoint seed giả lập lời nhắc mật khẩu. |
| Khởi tạo, seed và đọc số lượng trên file tạm | Working tree | Python 3.12.15 / PowerShell | 01/11/2026 | Đạt | 7 bảng; categories=2, pois=5, narrations=6, admin=1; 5 POI nháp. Gọi hàm seed với mật khẩu sinh ngẫu nhiên. |
| Lời nhắc nhập mật khẩu ẩn với người dùng thật | Working tree | PowerShell | 01/11/2026 | Chưa kiểm thử thủ công | Entrypoint đã test với `getpass` giả lập; cần thử tương tác trực tiếp trên máy của người dùng. |
| API Admin UC05/UC06 | Working tree | Python 3.12.15 / Windows / FastAPI TestClient | 01/11/2026 | Đạt: 8 test API; tổng 14 test | Đăng nhập, mật khẩu sai, tài khoản khóa, token thiếu/sai/hết hạn/thu hồi, đăng xuất, chuẩn hóa và CRUD danh mục. Database tạm; mật khẩu test sinh ngẫu nhiên. |
| Uvicorn và HTTP | Working tree | Windows / localhost | 01/11/2026 | Đạt | Database tạm: health 200, đăng nhập 200, danh sách danh mục 200 (2 mục), đăng xuất 204. |
| Web, mobile, GPS, TTS | — | — | 01/11/2026 | Chưa kiểm thử | Chưa triển khai trong phạm vi này; không suy ra kết quả từ kiểm thử API. |
