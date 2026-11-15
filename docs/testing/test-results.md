# Kết quả kiểm thử
## Cài mới toàn hệ thống trên máy khác (TC-NFR06) — 14/11/2026

Người thử: [Nguyễn Quốc An]. Commit `main`: `[27721c0]`., Node v26.13.0. Clone mới vào thư mục trống, làm theo [RUNNING.md](../../RUNNING.md).

**Cách tạo DB:** clone mới không có `backend/data/saigon_stories.db` (Git bỏ qua `*.db`). Máy này không có snapshot của nhóm để phục hồi, nên tạo DB mới bằng `init_db.py` rồi `seed_db.py --username admin`, [ĐIỀN: có/không] chạy `enrich_demo_content.py` và `add_demo_images.py`, rồi công bố địa điểm qua Admin. Vì vậy kết quả **không chứng minh** việc phục hồi snapshot đã duyệt của nhóm và nội dung demo không phải bản đã duyệt.

| Bước | Kết quả |
| --- | --- |
| Clone, tạo `.venv`, `pip install -r backend/requirements-dev.txt`, `npm ci` cho admin-web, guest-web, mobile | [đạt] |
| Kiểm tra DB trước khi tạo | Lỗi: `sqlite3.OperationalError: unable to open database file`. Nguyên nhân: `backend/data/` chỉ có `.gitkeep`, DB không nằm trong Git. Không phải lỗi mã nguồn |
| `init_db.py` rồi `seed_db.py --username admin` | [đạt]; `PRAGMA user_version` = 5 |
| `scripts/start-system.ps1` | [đạt] |
| Đăng nhập Admin web (5174) | Đạt sau khi đặt lại mật khẩu (xem Ghi chú 1) |
| Công bố địa điểm qua Admin | [số địa điểm đã công bố: 6, số bài VI/EN mỗi địa điểm: 2] |
| `scripts/check-test-readiness.ps1` lần 1 (DB mới, 1 địa điểm công khai) | **NOT READY**: 1 lỗi chặn (`Only 1 published places; PRD demo needs at least 5`), 1 cảnh báo (`apps/mobile/.env missing`). Các mục còn lại đạt: schema 5, 2 danh mục, 1 Admin, tệp ảnh tải lên đủ, API trả lời qua 127.0.0.1 và qua hai địa chỉ LAN |
| `scripts/check-test-readiness.ps1` lần cuối | [READY: 0 blocking problems, 1 warning(s).] |

Minh chứng: [`docs/testing/evidence/NFR06_cai-moi-may-an_20261114.png`].

**Ghi chú**

1. **Quên mật khẩu Admin.** `seed_db.py` không đổi mật khẩu của tài khoản đã có, và repo không có công cụ đặt lại mật khẩu. Máy này đặt lại bằng cách ghi đè `admin_accounts.password_hash` trực tiếp trong SQLite bằng hàm `password_hash` của `seed_db.py`, sau khi dừng hệ thống và sao lưu bằng `backup_db.py`, đồng thời xóa phiên cũ trong `admin_sessions`. Đây không phải quy trình chính thức; RUNNING.md hiện không có hướng dẫn đặt lại mật khẩu.
2. **Hai địa chỉ LAN.** Máy có hai IPv4 có gateway (một địa chỉ dạng mạng ảo, một địa chỉ Wi-Fi/LAN thường). Khi thử điện thoại nên chỉ định `-LanAddress` cho `start-system.ps1` để không tự chọn nhầm địa chỉ.
3. **Chưa chạy** trên máy này: các bộ test tự động trong RUNNING.md (unittest, Vitest, build, Playwright, Jest) và mọi ca thực địa trên điện thoại. Kết quả `READY` chỉ cho biết máy đủ điều kiện kỹ thuật để thử.

## Chạy lại các bộ tự động trên `main` `99e3d88` — 14/11/2026

Bản clone sạch của `main` (commit `99e3d88`, 12/11, gồm phần mở rộng A và C), chạy bằng Python 3.12.3 và Node v22.23.4 trên Linux (CI dùng Node 26 và thêm job Windows/Edge). Mọi bộ dùng SQLite tạm; không đụng DB chính.

| Bộ kiểm thử | Kết quả |
| --- | --- |
| Backend `unittest discover -s backend/tests` | **132/132 đạt** (gồm `test_audit_log.py` 19 ca) |
| Guest web `npm test` | Node **40/40**, Vitest **20/20** (gồm `nearMe.test.js`) |
| Build guest-web, admin-web | Thành công |
| Mobile `npm test -- --runInBand` | 17 bộ đạt, 1 bộ bỏ qua; **134 đạt**, 4 bỏ qua (ca HTTP cần fixture API) |
| Playwright e2e (Edge) | **Chưa chạy lại**, gồm ca tab Nhật ký (`TC-AUD-06`) và ca Gần tôi |
| Điện thoại thật (GPS, TTS, UC12, Gần tôi, ghi công ảnh) | **Chưa kiểm thử**; phiếu thực địa vẫn để trống |
| Kết quả CI trên GitHub | Chưa kiểm tra |

Phần mở rộng C: chi tiết thiết kế, giới hạn và việc còn lại ở [c-audit-log.md](../project/c-audit-log.md). DB chính `backend/data/saigon_stories.db` trên từng máy demo phải được migrate lên schema 5 (RUNNING.md) trước khi bật API mới.

## Chuẩn bị kiểm thử phần còn lại — 14/11/2026

Nền `main` `608bac1` (gồm A, B web, C và bảng phân công hoàn thiện). Windows, Python 3.12, Node 26. Kế hoạch các ca còn lại: [ke-hoach-kiem-thu-con-lai-2026-11-14.md](ke-hoach-kiem-thu-con-lai-2026-11-14.md).

| Việc | Kết quả |
| --- | --- |
| Migration 005 trên DB chính `backend/data/saigon_stories.db` | `--check` đạt rồi áp dụng; `user_version = 5`; `integrity_check` ok, `foreign_key_check` rỗng; dữ liệu giữ nguyên (5 địa điểm, 10 bài). Bản trước: `backups/before-migration-005-20261114T071912Z.db` |
| API khởi động trên DB chính (TestClient, tắt dọn thống kê) | `/api/v1/health` 200; `/api/v1/pois` 5 địa điểm; `/api/v1/admin/audit-log` không token 401 |
| Backend `unittest discover -s backend/tests` | **132/132** đạt |
| Guest Node + Vitest | **40/40** + **20/20** |
| Build Admin và guest | Đạt |
| Mobile Jest | **134** đạt + 4 HTTP bỏ qua |
| CI GitHub trên `608bac1` | Xanh 5/5 job, gồm e2e Playwright/Edge |
| PR #7 `feat/b-near-me-mobile` (chạy tại máy, worktree tạm) | Mobile **150** đạt + 4 bỏ qua (thêm 16 ca), guest 40 + 20; CI của PR xanh 5/5 (gồm 5 ca `nearMe.spec.js`). Chờ duyệt và merge |
| `scripts/check-test-readiness.ps1` trên DB chính | Mọi mục DB đạt; trên bản sao lưu schema 4 báo đúng lỗi "run migration 005 first" |

TC-AUD-06 (tab Nhật ký, Playwright) đã đạt trong job e2e của CI trên `99e3d88` ngày 12/11; ghi bổ sung vào test-cases. Chưa có kết quả: toàn bộ ca thực địa trên điện thoại (FT-1..6, 8..27), cài mới trên máy khác (NFR06), Chrome (NFR10).

Phát hiện khi kiểm tra máy: biến môi trường người dùng `SAIGON_DATABASE` vẫn trỏ tới `backend/data/local-dev.db` (đã xóa ngày 07/11). `start-system.ps1` tự đặt đường dẫn nên không bị ảnh hưởng; chạy uvicorn tay thì phải đặt lại biến hoặc xóa biến này.

## Phần mở rộng A: upload ảnh và ghi công ảnh — 09/11/2026

Nhánh `feat/a-image-upload` tách từ `main` `bfe907c`, thay đổi chưa commit. Phân công ở [phan-cong-ABCG-2026-11-10.md](../project/phan-cong-ABCG-2026-11-10.md).

| Thay đổi | Kiểm chứng |
| --- | --- |
| Migration 004 thêm `pois.image_credit`, `user_version = 4`; script `migrate_004_poi_image_credit.py` (kiểm thử trên bản sao, bắt buộc sao lưu); API từ chối DB schema 2 | `test_poi_images.py` nhóm `Migration004Tests` (3 ca) |
| `PUT/DELETE /api/v1/admin/pois/{id}/image`: JPG/PNG/WebP ≤ 2 MB, kiểm tra cả Content-Type và chữ ký tệp; `GET /api/media/pois/{file}`; xóa tệp cũ khi thay ảnh, đổi sang URL hoặc xóa địa điểm; chặn dùng lại đường dẫn của địa điểm khác và đường dẫn `../` | `test_poi_images.py` (7 ca API) |
| Admin: ô tải ảnh, xem trước, nút Xóa ảnh, ô Ghi công ảnh; web khách và mobile hiện ảnh kèm "Ảnh: …" ở trang chi tiết | `admin.spec.js › "Admin uploads an image with credit…"` (tải ảnh, kiểm ảnh hiển thị và ghi công ở trang khách, xóa ảnh) |
| `add_demo_images.py` điền ghi công cho 5 ảnh Wikimedia | `test_add_demo_images.py` (4 ca) |

| Bộ kiểm thử (lượt cuối) | Kết quả |
| --- | --- |
| Backend `unittest discover -s backend/tests` | 113/113 đạt |
| Guest Node + Vitest | 26 + 20 đạt |
| Mobile Jest | 124 đạt + 4 HTTP bỏ qua |
| Build Admin và Guest | Đạt |
| Playwright Edge | 41 đạt + 1 OSM opt-in bỏ qua, exit 0 |

DB chính: `--check` rồi áp dụng migration 004 (bản trước: `backups/before-migration-004-20261109T143253Z.db`), điền ghi công 5 ảnh (bản trước: `backups/before-image-credits-20261109T143253Z.db`). API khởi động lại với DB chính, `/api/v1/pois` trả `image_credit` cho 5 địa điểm. Chưa thử hiển thị ghi công trên điện thoại thật (giao cho LeeNaimThwuan ngày 12/11).

## Nhóm cải thiện P1 — 09/11/2026

Nhánh `feat/p1-improvements` tách từ `fix/p0-review-2026-11-09` (`1deb9bc`), thay đổi chưa commit. Windows, Python 3.12, Node 22; mọi bộ test dùng SQLite tạm.

| Thay đổi | Phạm vi PRD | Kiểm chứng |
| --- | --- | --- |
| Danh sách ngôn ngữ hỗ trợ ở backend (`app/core/locales.py`: vi, en, fr, zh, ja, ko) và `GET /api/v1/locales`; API từ chối mã ngoài danh sách; Admin chọn ngôn ngữ từ danh sách, ngôn ngữ đã có bài bị khóa; web khách và mobile hiện tên ngôn ngữ thay cho mã | PRD 5.6, BR03, BR05 | `test_admin_pois.py`, `narrationUtils.test.js`, Playwright Admin |
| Xóa bài thuyết minh (`DELETE …/narrations/{id}`); không cho xóa bài hợp lệ cuối của địa điểm đang công khai (409 `NARRATION_REQUIRED`) | UC08, BR03 | `test_admin_pois.py`; Playwright: hủy xác nhận giữ bài, đồng ý thì xóa |
| Giới hạn đăng nhập sai: 5 lần/15 phút theo username, trả 429 kèm `Retry-After`; đăng nhập thành công xóa phiên hết hạn quá 7 ngày | NFR01, BR10 | `test_admin_api.py` (2 ca mới); Playwright hiện thông báo khóa tạm |
| SQL song ngữ danh mục chuyển vào `migrations/003_category_bilingual.sql`; script đọc từ tệp; thêm `migrations/README.md` về thứ tự và cách nhận diện | NFR03, NFR06 | `test_category_preparation.py` 5/5; DB chính `--check` báo đã áp dụng, không ghi |
| Admin chia tab Tổng quan / Danh mục / Địa điểm (giữ tab qua `#hash` khi tải lại); `Places.jsx` tách thành `PlaceList`, `PlaceForm`, `PublicationPanel`, `NarrationEditor`, `strings`; danh sách địa điểm có tìm không dấu, lọc trạng thái, nhãn trạng thái tiếng Việt, xem trước ảnh | NFR04, UC07, UC09 | Build Admin; Playwright Admin/acceptance |
| Dashboard: biểu đồ cột lượt theo ngày cho khoảng đã chọn, rê chuột/Tab để đọc số; khoảng mặc định 7 ngày gần nhất | UC10, BR16, BR19 | Ca Playwright mới với 30 ngày dữ liệu fixture, kiểm tra 375 px không tràn trang |

| Bộ kiểm thử | Kết quả |
| --- | --- |
| Backend `unittest discover -s backend/tests` | 102/102 đạt |
| Guest Node + Vitest | 26 + 20 đạt |
| Mobile Jest | 124 đạt + 4 HTTP bỏ qua |
| Build Admin và Guest | Đạt |
| Playwright Edge, bốn dịch vụ test tự quản lý | 40 đạt + 1 OSM opt-in bỏ qua, exit 0 (gồm 2 ca mới: khóa tạm đăng nhập, biểu đồ) |

Thay đổi hành vi khiến test cũ phải sửa: Admin không còn hiển thị mọi phần trên một trang (test mở đúng tab); ô "Mã ngôn ngữ" thành danh sách chọn "Ngôn ngữ thuyết minh" nên không còn gõ được mã trùng (ca trùng 409 vẫn kiểm ở backend); trạng thái hiện "Nháp" thay cho `draft`; web khách và mobile hiện "Français" thay cho `fr`.

`user_version` vẫn chỉ đánh dấu migration 002. Chưa làm: upload ảnh, cột ghi công ảnh, chuyển logic địa điểm sang lớp service, ESLint/Prettier/ruff, CI.

## Sửa nhóm P0 sau rà soát — 09/11/2026

Nền `main` / `538eb4f`, thay đổi chưa commit. Windows, Python 3.12, Node 22; mọi bộ test dùng SQLite tạm.

Trước khi sửa, `unittest discover` chạy 95 test với **5 lỗi**: các test thêm ở `73f93e8`/`538eb4f` dùng `with sqlite3.connect(...)`, chỉ commit mà không đóng kết nối, nên Windows không xóa được DB tạm. Bảng 89/89 ở mục 07/11 không còn đúng với `main` từ 08/11.

| Thay đổi | Phạm vi PRD | Kiểm chứng |
| --- | --- | --- |
| Đóng kết nối SQLite trong `test_enrich_demo_content.py` và override của `test_day4.py` | NFR07 | Hai module 19/19 đạt với pytest |
| Mobile tự phát hỏi lại server trước khi phát; 404 thì bỏ POI khỏi danh sách; lỗi tải/TTS thì chờ 30 giây thay vì thử lại mỗi mẫu GPS | UC04-E2, BR01, BR08 | Jest `tests/location` 36/36, gồm 6 ca mới |
| Admin giữ phiên khi tải lại trang trong cùng tab (`sessionStorage`, xác nhận lại bằng `/admin/me`) | UC05 bước 2, A1; BR09 | Build Admin đạt; ca Playwright mới (xem bảng dưới) |
| Tìm kiếm bỏ dấu tiếng Việt và `đ` ở backend, mock web, mock/offline mobile | BR02 | Ca mới ở `test_public_api.py`, `publicApi.test.js`, `exploreFilter.test.js` |
| Gắn ảnh Wikimedia Commons có giấy phép cho 5 POI trong DB chính, có sao lưu trước | F07, NFR05 | `test_add_demo_images.py` 3/3; [nguồn và ghi công](../deployment/demo-images.md) |

| Bộ kiểm thử sau sửa | Kết quả |
| --- | --- |
| Backend `unittest discover -s backend/tests` | 98/98 đạt, exit 0 (pytest cùng thư mục: 98 đạt) |
| Guest Node + Vitest | 26 + 20 đạt |
| Mobile Jest | 123 đạt + 4 HTTP bỏ qua (chưa bật fixture riêng) |
| Build Admin và Guest | Đạt (`--configLoader runner`, output tạm) |
| Playwright Edge, bốn dịch vụ test tự quản lý, SQLite tạm | 38 đạt + 1 OSM opt-in bỏ qua, exit 0 |

Playwright có ca mới: Admin tải lại trang vẫn giữ phiên; sau đăng xuất hoặc khi token bị thu hồi thì về trang đăng nhập kèm thông báo. Ca UC09 trong `acceptance.spec.js` trước đây đăng nhập lần hai trên cùng tab để làm mới danh sách; nay chuyển sang tải lại trang, vì phiên được giữ theo UC05-A1. Lượt đầu chạy toàn bộ có một ca hết 30 giây khi mở Admin lần đầu (Vite khởi động lạnh) và kéo theo các ca đếm địa điểm; lượt chạy riêng và lượt toàn bộ cuối cùng đều đạt.

Chưa kiểm thử trên điện thoại thật cho thay đổi tự phát; cần thử: bật tự phát, Admin ẩn một POI, đi vào vùng POI đó và xác nhận không phát. Ảnh đang tải trực tiếp từ Wikimedia nên cần Internet; ứng dụng chưa hiển thị tác giả dưới ảnh.

## Hợp nhất DB chính và thư mục — 07/11/2026

Đã thay `backend/data/saigon_stories.db` bằng snapshot `local-dev.db`, giữ nguyên schema phiên bản 2 và toàn bộ dữ liệu bảy bảng. Đối chiếu schema/từng dòng và kiểm tra toàn vẹn/khóa ngoại đều đạt trước khi chạy lại API. Đã lưu ZIP dự phòng rồi xóa 9 DB phụ. Xem [biên bản chuyển DB](../deployment/database-consolidation-2026-11-07.md).

Admin, Guest web và mobile cùng dùng API với DB chính; Guest/mobile mặc định gọi API thật. `.env` mobile cục bộ đã chuyển `EXPO_PUBLIC_USE_MOCK=false`, bundle Android xác nhận giá trị `false` và URL LAN cổng 8000. Các ca UC12 trên điện thoại vẫn chờ người dùng thực hiện lại; cấu hình mới không thay kết quả kiểm thử thiết bị trước đó.

| Kiểm tra sau thay đổi | Kết quả |
| --- | --- |
| Backend unittest, SQLite tạm | 89/89 đạt, exit 0 |
| Guest Node + Vitest | 25 + 20 đạt, exit 0 |
| Mobile Jest | 116 đạt + 4 HTTP bỏ qua do chưa bật fixture riêng, exit 0 |
| Build Admin và Guest | Đạt, dùng `--configLoader runner`, exit 0 |
| Playwright Edge, bốn dịch vụ test riêng và SQLite tạm | 37 đạt + 1 OSM opt-in bỏ qua, exit 0; đã dọn config tạm và dừng dịch vụ test |
| HTTP hệ thống chính | Health, Public API qua hai Vite proxy và API LAN trả 200; Metro trả 200; Android bundle tải được |
| Lệnh quản lý dịch vụ | Script PowerShell parse hợp lệ; bật với IP rõ ràng, dừng và bật lại với IP LAN tự nhận đều thành công |

Lượt Playwright tự quản lý server ban đầu bị kẹt teardown và đã dừng, không tính là đạt. Lượt test cuối dùng bốn dịch vụ độc lập theo cách tái lập đã ghi ở [báo cáo trước](integration-2026-11-06.md); `.last-run.json` ghi `passed`, không có ca thất bại. Các bộ test không dùng DB chính để ghi/xóa dữ liệu.

## Xác nhận kiểm thử Admin và Guest web — 07/11/2026

Người dùng xác nhận **Admin web và Guest web đều đạt kiểm thử**. Đây là kết quả kiểm thử thủ công do người dùng cung cấp sau mốc `85ba378`, không phải lượt chạy lại bộ kiểm thử tự động.

| Thành phần | Kết quả | Nguồn xác nhận |
| --- | --- | --- |
| Admin web | Đạt | Người dùng xác nhận các chức năng đã kiểm thử đều đạt. |
| Guest web (web khách) | Đạt | Người dùng xác nhận các chức năng đã kiểm thử đều đạt. |

Chưa cung cấp danh sách ca chi tiết, trình duyệt/thiết bị và ảnh/video cho lượt xác nhận này. Kết quả mobile giữ theo cập nhật bên dưới: bản đồ, quyền vị trí, GPS và TTS VI/EN đạt theo phản hồi; đồng ý/rút đồng ý thống kê trên mobile vẫn chờ kiểm thử với API thật vì lượt thử dùng mock.

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
