# Tích hợp và kiểm thử Gate 2 — 03/11/2026

Ghi chú bàn giao: trạng thái Git và cam kết chưa commit/push bên dưới được ghi tại thời điểm kết thúc kiểm thử. Sau báo cáo, người dùng đã yêu cầu commit và push phần tích hợp lên `main`; kết quả kiểm thử và các giới hạn nghiệm thu vẫn giữ nguyên.

## Phiên bản và môi trường

Nhánh ban đầu `main`, HEAD `486ae4e1777d331f5628d00606b7a7db29698773` (`day03/path update`). `git status --short` ban đầu sạch. Phiên bản bàn giao là HEAD này cộng working tree chưa commit; không fetch, checkout, commit, push hoặc merge.

Người thực hiện: Codex, kiểm thử tự động trong workspace. Chưa có xác nhận kiểm thử chéo của thành viên nhóm hoặc nghiệm thu thiết bị. Windows/PowerShell, Python `.venv` 3.12.15, Node 26.13.0, Edge headless; FastAPI 0.115.12, Vite Admin 7.3.7 / guest 8.3.5, Expo SDK 56. Không nâng cấp các dependency hiện có.

Mọi kiểm tra API dùng SQLite riêng trong TemporaryDirectory và dữ liệu published/draft/hidden. Không đọc/ghi database cá nhân hoặc vận hành, không công bố nội dung thật. Tài liệu này chỉ ghi bằng chứng từ repository và các lượt chạy; thông tin phân công ngoài repo không được sao chép vào đây.

## Đối chiếu phát hiện cũ với mã nguồn hiện tại

| Phát hiện | Bằng chứng trước sửa tại 486ae4e | Kết luận |
| --- | --- | --- |
| Mobile chính nằm ở apps/mobile | Có package.json, Expo entrypoint, Jest và README tại đây | Vẫn đúng |
| Commit 0e2e16f thêm marker/test sai vị trí | git show xác nhận 5 file dưới mobile/apps/mobile và mobile/docs/mobile; app chính không import mapMarkers | Còn tồn tại, đã tích hợp và dọn bản trùng |
| MapScreen dùng tọa độ thô | Marker và fitToCoordinates đều dùng data.pois trực tiếp | Còn tồn tại, đã sửa |
| Guest MapPage giữ chỗ | Chỉ render Empty với mapPending, chưa có dependency bản đồ | Còn tồn tại, đã thay bằng bản đồ |
| Admin và tra cứu khách đã có code/test | test_admin_api.py, test_public_api.py và guest.spec.js cùng UI đang có | Giữ phần đúng, chạy lại và mở rộng browser test |
| Chưa có kết quả điện thoại | Checklist thực địa chưa điền, không tìm thấy adb/emulator khả dụng | Vẫn chưa kiểm thử, không suy ra PASS từ Jest/export |

Đã đọc README, RUNNING, API_CONTRACT, các file/test liên quan; so sánh hai MapScreen bằng `git diff --no-index`. Giữ timer chờ map, kiểm tra chi tiết force, xác thực/thu hồi phiên, CRUD/NFC danh mục và public published filter đã có trước. Không phát hiện hồi quy backend/Admin/UC01 trong phạm vi các ca đã chạy.

## Thay đổi và ảnh hưởng

| Phần việc | File thay đổi | Lý do / hành vi |
| --- | --- | --- |
| Marker mobile từ 0e2e16f | apps/mobile/src/features/map/mapMarkers.js, MapScreen.js; src/context/translations.js | ID chuỗi opaque không rỗng, bỏ ID trùng, tọa độ hữu hạn trong miền. Render/fit/timer dùng cùng tập hợp lệ; không phụ thuộc radius geofence. Rỗng/toàn sai có đường về danh sách |
| Lỗi mobile | MapScreen.js; tests/map/MapScreen.test.js | Phản hồi ghim cũ không ghi đè ghim mới; 404 bỏ ghim; lỗi mạng không mở chi tiết chưa kiểm tra; stale data trong phiên có nút thử lại. Thêm 8 ca component giả lập native map/GPS |
| Test mobile chuyển về app chính | tests/map/mapMarkers.test.js, tests/places/exploreFilter.test.js | Giữ 4 test marker từ commit cũ rồi mở rộng thành 6; giữ nguyên 6 test tìm/lọc hoa thường, NFC, danh mục, kết hợp và rỗng |
| API mobile thật | tests/services/backend.integration.test.js | Hai ca HTTP opt-in, dùng fixture riêng; ca chung và ca Gate 2 có ID xác định |
| Bản đồ guest | src/features/map/mapMarkers.js, PlacesMap.jsx; src/pages/MapPage.jsx; src/i18n/translations.js; src/styles/global.css | Leaflet/OSM, chỉ public API hiện có, tọa độ hợp lệ, căn vùng, summary/detail/404, loading/rỗng/lỗi/retry, đường về danh sách. Ghim và nút tên hỗ trợ bàn phím, không yêu cầu GPS |
| Dependency guest | package.json, package-lock.json | Chỉ thêm Leaflet 1.9.4, không nâng cấp hàng loạt |
| Browser/unit guest | tests/mapMarkers.test.js, map.spec.js, admin.spec.js, guest.spec.js | 3 unit marker, 12 ca browser map, 3 ca Admin mới; thay kiểm tra placeholder cũ bằng kiểm tra chức năng đã có |
| Fixture/cấu hình | tests/serve_api.py, playwright.config.js | Tọa độ hai ghim khác nhau, route __test chỉ trong fixture để ẩn/khôi phục DB tạm. Cho chọn host/port khi thử LAN, Playwright cố định loopback/18082; Admin Vite dùng configLoader runner |
| Tài liệu | README.md, RUNNING.md, apps/guest-web/README.md, apps/mobile/README.md, docs/mobile/README.md, docs/mobile/testing/day2-gate2-mobile.md, docs/testing/test-results.md và báo cáo này | Hướng dẫn hiện tại dùng apps/, phân biệt mock/API/tile, lệnh test, giới hạn và checklist thiết bị |

Năm tệp bản trùng dưới `mobile/apps/mobile/...` và `mobile/docs/mobile/testing/day2-gate2-mobile.md` đã được đối chiếu trước khi xóa: logic gộp vào app chính, helper/test chuyển đủ, checklist giữ nội dung hữu ích và cập nhật hướng dẫn. Không xóa đệ quy hoặc xóa thay đổi chưa commit của người dùng. Báo cáo lịch sử giữ nguyên đường dẫn ở thời điểm cũ.

Ảnh hưởng đến ứng dụng khác: không sửa backend hoặc Admin UI sản phẩm vì các ca liên quan đạt; không đổi schema SQLite, endpoint sản phẩm hoặc hợp đồng public `/api/v1`. Route __test chỉ đăng ký trong script fixture, không được import vào backend vận hành. Không đổi dữ liệu danh mục/nội dung, cơ chế ngôn ngữ thuyết minh, TTS, GPS nền hoặc thêm offline. Web thêm request tile bên ngoài khi vào bản đồ và chunk Leaflet tải khi cần. Mobile giữ cơ chế dữ liệu trong bộ nhớ của phiên đã có.

## Trước sửa và lỗi đã xử lý khi chạy

| Lượt | Kết quả thực tế |
| --- | --- |
| Backend trước sửa | 60/60 unittest, exit 0 |
| Mobile trước sửa | 47 pass + 1 skip API, exit 0; test ở thư mục lệch không được chạy |
| Guest trước sửa | Node 4/4. Test/build mặc định EPERM ở .vite-temp; dùng configLoader runner thì Vitest 11/11 nhưng build còn bị chặn ghi dist |
| Admin trước sửa | Build EPERM ở .vite-temp; dùng runner vẫn bị chặn ghi/xóa dist |
| Browser trong sandbox | EPERM ở test-results, kể cả output mới; worker lỗi, server không tự thoát. Không báo suite PASS/exit 0 cho lượt này. Đã dừng đúng PID server test vừa tạo |
| Cài Leaflet | npm sandbox bị EACCES tới registry; chạy lại với quyền môi trường phù hợp thành công, thêm 1 package |
| Test mobile mới lần đầu | 1 ca test.each dùng mảng rỗng bị Jest hiểu là chờ done; sửa fixture test thành object, không tăng timeout |
| Browser lượt đầu có quyền ghi | 22/24, exit 1. Selector alert Admin khớp hai module; ghim focus được nhưng Enter chưa gọi select khi không có popup. Thu hẹp selector theo panel, thêm Enter/Space cho marker |
| Browser sau sửa | 24/24, 27.4s, exit 0; lượt xác nhận thêm sau cấu hình host/port fixture đạt 24/24, 27.6s, exit 0. Teardown hoàn tất, không có tình trạng chỉ hiện PASS nhưng tiến trình còn treo |

Các EPERM là giới hạn quyền môi trường. Build/export/browser/unit guest đã được chạy lại với quyền ghi phù hợp và output riêng; không xóa dist/cache cũ của người dùng. Bộ duyệt tự động từ chối đưa metadata phân công ngoài repo vào tài liệu; báo cáo này chỉ giữ mã nguồn/kết quả, đề xuất đối chiếu được bàn giao riêng trong hội thoại.

## Lệnh và kết quả sau sửa

Lệnh từ gốc repo trừ khi ghi khác. Output sinh ra nằm trong thư mục bị Git bỏ qua.

| Lệnh đã chạy | Kết quả | Nguồn dữ liệu / giới hạn |
| --- | --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v` | 60/60, exit 0 trước và sau sửa | FastAPI TestClient + SQLite tạm, auth/category/public/migration/analytics |
| `.\.venv\Scripts\python.exe -m pytest backend/tests/test_analytics.py -q --basetemp=backend/.pytest-tmp/integration-20261103` | 27/27, exit 0 | Trùng 27 ca analytics trong unittest, không cộng thành 87 ca độc lập. Warning Starlette/AnyIO deprecation và cache Pytest không ghi được |
| `npm.cmd --prefix apps/admin-web run build -- --configLoader runner --outDir dist/integration-20261103` | Thành công, exit 0 | Không có npm unit-test script Admin; browser test kiểm tra UI |
| `npm.cmd --prefix apps/guest-web test -- --configLoader runner` | Node 7/7 + Vitest 11/11, exit 0 | Fetch/logic/privacy giả lập, không gọi đây là 18 test HTTP thật |
| `npm.cmd --prefix apps/guest-web run build -- --configLoader runner --outDir dist/integration-final-20261103` | Thành công, exit 0 | Chunk Leaflet riêng |
| `npm.cmd --prefix apps/guest-web run test:browser -- --reporter=line --output=test-results/integration-acceptance-20261103` | 24/24, exit 0 | 4 Admin + 8 guest UC01/privacy + 12 map; Edge/FastAPI thật, SQLite tạm. Mọi tile là ảnh fixture; ca lỗi/tọa độ hỏng dùng response giả lập |
| `npm.cmd --prefix apps/mobile test -- --runInBand` | 67 pass + 2 skip, exit 0 | Native map/GPS bị mock trong component test; chưa chọn URL nên hai ca HTTP bỏ qua |
| Cùng lệnh mobile, đặt `SAIGON_TEST_API_URL=http://127.0.0.1:18082/api`, `SAIGON_TEST_FIXTURE=gate2`, chạy serve_api.py riêng | 69/69, 10 suites, exit 0 | Hai integration test dùng node:http tới FastAPI/SQLite tạm: published markers, NFC/category, rỗng, draft/hidden/missing 404, bài EN/FR/VI |
| Từ apps/mobile: `npx.cmd expo config --type public` | Thành công, exit 0 | SDK 56, chỉ quyền vị trí foreground. Expo đọc .env cục bộ; không đưa .env vào Git |
| Từ apps/mobile: `$env:EXPO_NO_TELEMETRY='1'; $env:CI='1'; npx.cmd expo export --platform android --output-dir dist/integration-final-20261103` | Thành công, exit 0: 909 modules, HBC khoảng 2.3 MB | Chỉ compile bundle Android; chưa cài/chạy native, chưa build iOS |

Browser với API thật xác nhận chỉ hai POI published; ẩn palace sau khi tải danh sách rồi chạm ghim và mở chi tiết đều không xem được nội dung cũ. UC01 search/filter AND, NFC, rỗng, lỗi/retry và bài FR độc lập UI VI/EN đạt. Admin wrong password, tài khoản khóa (backend), logout/revoked token, CRUD/validation/NFC/RESTRICT và lỗi UI/API đều có ca tự động.

## Tile thật và phần chưa nghiệm thu

Kiểm tra khói riêng bằng Edge, guest mock có nhãn và tile OSM thật: lần đầu chờ tile timeout 30 giây. Lượt chẩn đoán xác nhận 12 request `net::ERR_CONNECTION_REFUSED`, không có response thành công. Một script trung gian lỗi selector do Unicode qua pipeline PowerShell; đã dùng selector ASCII và chạy hoàn tất. Không báo PASS tải nền bản đồ thật.

Lượt chẩn đoán hoàn tất exit 0 xác nhận fallback hoạt động: vẫn có 5 marker mock, summary/detail và đường về danh sách, số gọi GPS bằng 0, viewport 390px không tràn ngang. Ảnh ở `apps/guest-web/test-results/map-provider-desktop.png` và `map-provider-mobile.png`, không được Git theo dõi. Đây là ảnh lỗi tile với dữ liệu mock, không phải ảnh nền OSM tải thành công.

Theo [chính sách OSM](https://operations.osmfoundation.org/policies/tiles/), tile công cộng không có SLA; giữ attribution/cache/Referer, không bulk/prefetch/offline. [Leaflet 1.9.4](https://leafletjs.com/reference-1.9.4.html) được khóa phiên bản. Không thêm key/tài khoản thanh toán; xem điều kiện sử dụng trong guest README. Cần thử trên mạng truy cập được OSM trước nghiệm thu nền map.

Không có điện thoại/emulator khả dụng. Chưa xác nhận native rendering/provider key, quyền vị trí Android/iOS, thao tác/mạng trên thiết bị, GPS/TTS thực địa hoặc iOS build. [Checklist Gate 2](../mobile/testing/day2-gate2-mobile.md) ghi rõ “Chưa kiểm thử” và bước LAN, fixture published, ẩn/khôi phục, tọa độ sai, GPS từ chối, loading/lỗi/retry, chọn nhanh ghim và UI/narration độc lập. Phiếu NFR07 vẫn để nhóm thực hiện.

## Kết luận theo tiêu chí ngày 02/11

| Tiêu chí | Kết luận |
| --- | --- |
| Admin login/logout, tạo/sửa/xóa danh mục | Đạt API và browser trong phạm vi đã chạy, giữ code nghiệp vụ; chưa thay kiểm thử chéo thủ công |
| Guest tìm kiếm/lọc/chi tiết | Đạt tự động với API thật/SQLite tạm, gồm ngoại lệ và VI/EN độc lập bài |
| Mobile tìm kiếm/lọc/chi tiết | Đạt logic + HTTP contract; chưa nghiệm thu UI trên điện thoại/emulator |
| Marker web | Đã triển khai; unit/browser với tile fixture đạt, keyboard/summary/detail/404/retry đạt; tile thật bị từ chối kết nối |
| Marker mobile | Đã tích hợp đúng app; helper/component/API và Android bundle đạt; native/permission trên thiết bị chưa kiểm thử |

Không đánh dấu toàn bộ Gate 2 đã nghiệm thu trước khi hoàn thành phần thiết bị và nền map trên mạng thực tế.

## Bàn giao để nhóm tự ghi nhận

Phiên bản: `486ae4e + working tree chưa commit`, thay bằng hash thực tế sau khi nhóm tự review/commit. Người chạy: Codex, kiểm thử tự động; ngày 03/11/2026. Môi trường: Windows/Python 3.12.15/Node 26.13.0/Edge, DB tạm. Ca/kết quả: 60 backend, 18 guest unit, 24 browser, 69 mobile với API; không cộng trùng 27 pytest. Trạng thái: phần tự động đạt, còn native thiết bị và xác minh tile thật. Nhóm đối chiếu mã phân công tương ứng với UC05, UC06, UC01, UC02 và công việc tài liệu trước khi tự cập nhật bảng.

Không tự sửa bảng phân công, tạo commit, push hoặc merge. Không thêm .env thật, token, mật khẩu thật, database cá nhân, node_modules, build output hay upload người dùng vào Git. Credentials trong serve_api.py là fixture kiểm thử có sẵn từ trước, không phải tài khoản vận hành.

Rà soát cuối: `git diff --check` đạt; 18 file hiện có được sửa, 10 file mới và 5 bản trùng sai vị trí bị xóa (Git chưa stage nên chưa hiển thị chúng như rename). Danh sách file thay đổi không chứa .env/database/node_modules/dist/build/storage; kiểm tra mẫu khóa API/private key và conflict marker không phát hiện kết quả; các liên kết tài liệu local đã kiểm tra đều tồn tại. Mọi thay đổi còn trong working tree để nhóm review.
