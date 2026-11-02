# Bàn giao sửa tích hợp – 02/11/2026

> Báo cáo lịch sử: tên đường dẫn và lệnh trong nội dung thuộc commit được kiểm tra lúc đó. Đích liên kết đã đổi theo cấu trúc apps; xem [hướng dẫn hiện tại](../deployment/setup.md) để chạy dự án.


## Xác minh trước khi sửa

Nhánh `main`, commit `3bf8256a61e87ec8d5779288e71bccdb7f85e106`; đã đối chiếu head GitHub bằng connector. Git HTTP từ shell bị hạn chế mạng, không fetch/merge. Working tree chỉ có `docs/testing/retest-2026-11-02.md` từ lần kiểm tra trước; tệp đó được giữ nguyên. Không có thay đổi ứng dụng chưa commit nào cần dừng để tránh ghi đè.

Lỗi vẫn tồn tại lúc bắt đầu: guest gọi /api/public thay cho /api/v1, nhận mảng thay cho items, card đọc narrations thay narration_locales; UI chỉ Việt; riêng tư hứa consent/retention chưa hoạt động. Hai schema analytics có CHECK/default/index khác nhau; CREATE TABLE IF NOT EXISTS không nâng cấp bảng cũ. API public/backend cũ đã có test bảo vệ published và tìm/lọc; không kết luận phần backend này hỏng chỉ vì guest không tích hợp.

## Đã sửa

- Adapter guest gọi API /api/v1; bóc items và đọc narration_locales. Chi tiết giữ narrations. Empty, lỗi mạng, response sai và 404 có xử lý riêng; lỗi thật không fallback mock.
- Tách cấu hình Vite khỏi adapter có thể kiểm thử. Mock giữ shape list/detail tương ứng; có thông báo dữ liệu mẫu, console dev ghi mock hoặc API cùng base URL. .env.example có base /api/v1.
- UI VI/EN cho màn hình hiện tại và trạng thái lỗi/rỗng/tải; lưu localStorage riêng, không đổi bài đã chọn khi đổi UI. Test có FR chỉ trong fixture, không thêm bản dịch vào seed hay dữ liệu vận hành.
- Trang riêng tư và TTS/bản đồ mô tả đúng trạng thái đang phát triển.
- Giữ 001 làm lịch sử; 002 là DDL analytics chuẩn. Init mới chạy cả hai. Script upgrade hỗ trợ kiểm tra snapshot chỉ đọc, backup mới bắt buộc khi áp dụng, copy/kiểm tra trước khi bỏ bảng cũ, transaction/rollback, kiểm tra FK/integrity và khôi phục enforcement.
- API_CONTRACT là nguồn chung, api-design dẫn về đó, tách rõ API chạy được và API đề xuất. schema_analytics chỉ còn truy vấn tham chiếu, không DDL cạnh tranh.

## Kiểm thử đã chạy

| Nhóm | Kết quả thực tế |
| --- | --- |
| Backend toàn bộ | 24/24 đạt: 8 Admin, 6 database/seed, 2 public, 8 migration |
| Migration sau bổ sung kiểm tra default consent | 8/8 chạy lại đạt |
| Adapter Node | 4/4 đạt; gồm phản hồi sai ở list và detail, lỗi mạng/404/rỗng, query Unicode, mock không gọi mạng |
| Playwright/Edge + API thật | 7/7 đạt ở lần cuối, 12.3 giây; hai Vite mock/thật + FastAPI và database tạm, có published/draft/hidden |
| Guest npm ci sạch | Đạt với package/lockfile cuối trong thư mục tạm; không có local file dependency |
| Guest build | Đạt Vite 8.3.5, source cuối, output tạm |
| Admin build | Đạt Vite 7.3.7, --configLoader runner và outDir tạm |
| git diff --check và link tài liệu liên quan | Đạt |

Node 22.22.0, Python 3.12.15, Windows và Edge headless. Workspace bị EPERM khi ghi node_modules/dist, nên guest được sao chép nguyên source/config/lockfile vào thư mục tạm để cài và chạy; Admin chỉ thay vị trí output và config loader cho lần kiểm tra. Không thay cấu hình build sản phẩm chỉ để vượt hạn chế môi trường.

Có một lỗi trong bộ test browser ban đầu: bộ đếm request bắt cả đường dẫn module /src/api; đã sửa để chỉ đếm pathname bắt đầu /api/. Lần chạy cuối đạt toàn bộ. Các test mock/adapter dùng fetch giả lập không được dùng làm bằng chứng backend; bộ backend và browser thật kiểm tra riêng.

## Nâng cấp database có sẵn

Chưa chạy migration trên database cá nhân. Dừng API/writer, kiểm tra đúng file bằng --check, rồi chỉ áp dụng với --backup trỏ đến tên chưa có. Xem [lệnh và quy trình đầy đủ](../../backend/README.md#nâng-cấp-schema-thống-kê).

Ràng buộc mới chỉ cho hai bảng analytics: UUID v4 chữ thường chuẩn, UTC 24 ký tự YYYY-MM-DDTHH:MM:SS.mmmZ có ngày/giờ hợp lệ, consent INTEGER 0/1 mặc định 1, last_seen_at >= created_at, event.session_id NULL hoặc FK tồn tại với ON DELETE SET NULL, ba index chuẩn. Không áp dụng định dạng thời gian này lên bảng Admin.

UUID viết hoa/khác version hoặc timestamp dạng offset có thể là dữ liệu có ý nghĩa trong schema cũ nhưng không đạt schema mới; migration báo lỗi và rollback, không tự đổi. Cần chủ dữ liệu review và quyết định cách xử lý. Cột/kiểu/PK/version không biết, custom index và đối tượng phụ thuộc analytics cần migration riêng; script dừng thay vì tự bỏ chúng.

## Chưa triển khai / còn cần nhóm review

Analytics heartbeat/revoke, dashboard, retention job, GPS/TTS và bản đồ không được triển khai trong đợt này. Không coi WBS-08/WBS-09 hoàn tất. Mobile chưa được sửa/test trong đợt này; adapter contract/analytics cũ của mobile vẫn cần công việc tích hợp riêng.

Chưa kiểm tra production, mọi browser/thiết bị hoặc database riêng. Nhóm cần review schema analytics chặt hơn trước khi nâng cấp dữ liệu thật, xác nhận các API đề xuất của hợp đồng và bộ nội dung/locale đã kiểm duyệt. Không có quyết định nào cần chặn việc hoàn tất các sửa đổi cục bộ này.

## File thay đổi và diff cần review

Ưu tiên review `migrate_db.py`, `002_analytics_constraints.sql`, `API_CONTRACT.md` và adapter guest trước khi commit. Migration/test là file mới nên `git diff` thông thường không hiển thị nội dung của chúng khi chưa được stage; mở trực tiếp theo danh sách.

| Loại | File |
| --- | --- |
| Sửa | [.gitignore](../../.gitignore) |
| Sửa | [README.md](../../README.md) |
| Sửa | [backend/README.md](../../backend/README.md) |
| Sửa | [backend/data/schema_analytics.sql](../../backend/data/schema_analytics.sql) |
| Sửa | [backend/scripts/init_db.py](../../backend/scripts/init_db.py) |
| Sửa | [backend/tests/test_public_api.py](../../backend/tests/test_public_api.py) |
| Sửa | [docs/API_CONTRACT.md](../../docs/API_CONTRACT.md) |
| Sửa | [docs/analysis-design/api-design.md](../../docs/analysis-design/api-design.md) |
| Sửa | [docs/analysis-design/database-design.md](../../docs/analysis-design/database-design.md) |
| Sửa | [docs/deployment/setup.md](../../docs/deployment/setup.md) |
| Sửa | [docs/testing/test-cases.md](../../docs/testing/test-cases.md) |
| Sửa | [docs/testing/test-results.md](../../docs/testing/test-results.md) |
| Sửa | [web/guest-web/.env.example](../../apps/guest-web/.env.example) |
| Sửa | [web/guest-web/README.md](../../apps/guest-web/README.md) |
| Sửa | [web/guest-web/package-lock.json](../../apps/guest-web/package-lock.json) |
| Sửa | [web/guest-web/package.json](../../apps/guest-web/package.json) |
| Sửa | [web/guest-web/src/api/client.js](../../apps/guest-web/src/api/client.js) |
| Sửa | [web/guest-web/src/api/publicApi.js](../../apps/guest-web/src/api/publicApi.js) |
| Sửa | [web/guest-web/src/components/AppLayout.jsx](../../apps/guest-web/src/components/AppLayout.jsx) |
| Sửa | [web/guest-web/src/components/PoiCard.jsx](../../apps/guest-web/src/components/PoiCard.jsx) |
| Sửa | [web/guest-web/src/components/StateViews.jsx](../../apps/guest-web/src/components/StateViews.jsx) |
| Sửa | [web/guest-web/src/main.jsx](../../apps/guest-web/src/main.jsx) |
| Sửa | [web/guest-web/src/pages/ExplorePage.jsx](../../apps/guest-web/src/pages/ExplorePage.jsx) |
| Sửa | [web/guest-web/src/pages/MapPage.jsx](../../apps/guest-web/src/pages/MapPage.jsx) |
| Sửa | [web/guest-web/src/pages/NotFoundPage.jsx](../../apps/guest-web/src/pages/NotFoundPage.jsx) |
| Sửa | [web/guest-web/src/pages/PoiDetailPage.jsx](../../apps/guest-web/src/pages/PoiDetailPage.jsx) |
| Sửa | [web/guest-web/src/pages/PrivacyPage.jsx](../../apps/guest-web/src/pages/PrivacyPage.jsx) |
| Sửa | [web/guest-web/src/styles/global.css](../../apps/guest-web/src/styles/global.css) |
| Sửa | [web/guest-web/vite.config.js](../../apps/guest-web/vite.config.js) |
| Mới | [backend/migrations/002_analytics_constraints.sql](../../backend/migrations/002_analytics_constraints.sql) |
| Mới | [backend/scripts/migrate_db.py](../../backend/scripts/migrate_db.py) |
| Mới | [backend/tests/test_analytics_migration.py](../../backend/tests/test_analytics_migration.py) |
| Mới | [web/guest-web/playwright.config.js](../../apps/guest-web/playwright.config.js) |
| Mới | [web/guest-web/src/api/index.js](../../apps/guest-web/src/api/index.js) |
| Mới | [web/guest-web/src/i18n/LanguageContext.jsx](../../apps/guest-web/src/i18n/LanguageContext.jsx) |
| Mới | [web/guest-web/src/i18n/translations.js](../../apps/guest-web/src/i18n/translations.js) |
| Mới | [web/guest-web/tests/guest.spec.js](../../apps/guest-web/tests/guest.spec.js) |
| Mới | [web/guest-web/tests/publicApi.test.js](../../apps/guest-web/tests/publicApi.test.js) |
| Mới | [web/guest-web/tests/serve_api.py](../../apps/guest-web/tests/serve_api.py) |
| Mới | [web/guest-web/tests/vite.config.js](../../apps/guest-web/tests/vite.config.js) |
| Mới | [Bản bàn giao này](integration-fixes-2026-11-02.md) |

Lý do theo nhóm: backend/data/scripts/migrations chuẩn hóa schema và đường nâng cấp; backend/tests bảo vệ public contract và dữ liệu khi migrate; guest api/i18n/components/pages xử lý tích hợp và UI VI/EN; package/config/tests phục vụ kiểm thử Node và Edge (thêm duy nhất @playwright/test vào devDependencies); docs/README thống nhất hợp đồng và lệnh Windows; .gitignore bỏ qua artifact Playwright.

Diff thu gọn các hợp đồng trùng/mâu thuẫn về một nguồn, bổ sung migration và test, đổi nội dung guest theo locale; giữ nguyên PRD, migration 001, backend public routes, seed và mã Admin/mobile. Không commit, push hoặc merge.

## Lệnh tự kiểm tra và chạy

Lệnh backend/Admin/guest đầy đủ ở [setup Windows](../deployment/setup.md), [guest README](../../apps/guest-web/README.md) và [backend README](../../backend/README.md). Từ gốc repo:

```powershell
git status --short
git diff --stat
git diff --check
git diff -- backend/scripts/init_db.py web/guest-web docs/API_CONTRACT.md
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm.cmd --prefix web/guest-web test
npm.cmd --prefix web run build
npm.cmd --prefix web/guest-web run build
Set-Location web/guest-web
npm.cmd ci
npm.cmd run test:browser
```

Cài dependency từng web trước khi build nếu máy chưa có. Browser test cần Edge và .venv có requirements-dev; tự chạy API tại 18082, Vite tại 18173/18174 và từ chối dùng lại server khác. Ba cổng cần trống. Chọn dữ liệu published chỉ trong fixture tạm, không sửa database đang sử dụng.
