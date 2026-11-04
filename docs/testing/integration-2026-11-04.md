# Tích hợp tồn đọng đến 03/11 — kiểm chứng 04/11/2026

Ghi chú bàn giao: sau khi hoàn tất kiểm thử và báo cáo, người dùng đã yêu cầu tạo commit và push phần tích hợp lên `main`. Các mô tả working tree/chưa commit bên dưới ghi nhận trạng thái lúc kết thúc kiểm thử; tra lịch sử Git để lấy commit bàn giao. Kết quả kiểm thử và các phần chưa nghiệm thu giữ nguyên.

## Kiểm chứng bổ sung trước push sau khi ghép main mới

Fetch phát hiện `origin/main` đã có `aa0d2d7` của An (ngày 04/11), gồm UC09, UC10–UC11, Dashboard và tích hợp analytics. Tạo commit cho 45 file đã rà soát rồi rebase lên commit này, xử lý thủ công xung đột ở `backend/app/main.py` và `backend/app/api/routes/analytics.py`. Giữ route/dashboard, error.details của publish, dependency analytics autocommit của An, hàm `run_cleanup_once` và cờ `SAIGON_DISABLE_CLEANUP=1`. Dùng một lịch retention 00:00 Việt Nam; không chạy đồng thời lịch 6 giờ. Không ghi đè cả file bằng phiên bản cũ, không đổi schema hoặc database cá nhân.

Chạy lại sau khi ghép: backend unittest **79/79**, gồm 10 ca ngày 04/11 của An; guest **25 Node + 20 Vitest**; build Admin **30 modules**, tất cả exit 0. Playwright **31 ca chức năng đạt, 1 ca chẩn đoán OSM opt-in bỏ qua**, 43.1s, exit 0, output `apps/guest-web/test-results/push-main-20261104`. OSM thật không chạy lại trong lượt push; kết quả 15 connection refused của lượt nghiệm thu bên dưới vẫn là bằng chứng gần nhất. Mobile không đổi mã trong rebase, giữ kết quả 85/85 và Android export của lượt trước.

README/API contract được cập nhật để phản ánh UC09/UC10–UC11 từ commit của An; đây là phần đã có trên remote được giữ khi push, không phải mở rộng triển khai từ nhiệm vụ tồn đọng. Các mục bên dưới là báo cáo gốc tại `97e1ad6`; con số 69 backend và mô tả chưa có UC09/dashboard thuộc mốc trước khi fetch/rebase này. Chưa nghiệm thu đầy đủ dashboard trên thiết bị/trình duyệt ngoài các kiểm tra hồi quy đã chạy.

## Phiên bản, phạm vi và dữ liệu

Nhánh ban đầu `main`, commit `97e1ad6ded006025dd9e577656f50e4f7b29fb06`. `git status --porcelain=v1` ban đầu rỗng. Bản bàn giao là commit này cộng working tree để nhóm review, chưa stage/commit/push/merge. Không sửa bảng phân công. Người chạy: Codex trong workspace, chưa có xác nhận kiểm thử chéo của thành viên nhóm.

Đã đọc README, RUNNING, API contract, migration 001/002, code/test liên quan, PRD (BR13–BR18) và báo cáo trước. Đối chiếu `git diff 00f0835 97e1ad6` và mã hiện tại. Mọi API/test/migration/seed chạy trong TemporaryDirectory riêng hoặc database thử nghiệm do test tạo; không khởi động API bằng database cá nhân, không đọc/ghi/seed/migration database vận hành. Fixture published/draft/hidden và bài VI/EN/FR chỉ là dữ liệu test, không công bố nội dung thật hoặc tự dịch nội dung.

Upload ảnh loại khỏi phạm vi; giữ URL ảnh và thông báo chưa upload có sẵn. Không thêm màn hình upload, offline, GPS nền, dashboard hoặc endpoint UC09. Route `__test` chỉ tồn tại trong script fixture, không được đăng ký ở FastAPI sản phẩm.

## Phát hiện cũ và mốc trước sửa

| Phát hiện | Kết quả kiểm tra tại HEAD ban đầu |
| --- | --- |
| Hồi quy bản đồ sau TTS | Còn đúng: `97e1ad6` xóa 11 khóa bản đồ trên mỗi ngôn ngữ và CSS `.places-map`, wrapper, marker, summary; thay bằng placeholder dù MapPage vẫn dùng Leaflet. Khôi phục ghép với TTS, không chép đè cả file từ commit cũ |
| Analytics chưa tích hợp | Còn đúng: router chưa include trong main, dependency ném NotImplementedError; AppLayout chỉ có consent-slot, PrivacyPage báo chưa triển khai |
| URL/response không thống nhất | Còn đúng: client ghép base `/api/v1` với `/api/analytics` thành URL sai; schema API nhận UUID mọi phiên bản nhưng SQLite chỉ nhận v4; contract chung còn nói chưa có CRUD POI/analytics |
| UC07–UC08 đã có code/test | Đúng, phần nghiệp vụ chính qua test ban đầu. Không thay toàn bộ công việc của Nguyên; thêm bảo vệ biểu mẫu lúc lưu và kiểm thử ngoại lệ |
| Mobile TTS/map chưa có bằng chứng điện thoại | Vẫn đúng: không có adb/emulator khả dụng, không chạy điện thoại thật |
| Tile OSM thật từng bị chặn | Tái hiện ngày 04/11 với Edge: 15 request bị từ chối, 0 response thành công |

Trước sửa: backend **60/60** unittest; guest **20 Node + 11 Vitest**; mobile **67 pass + 2 HTTP skip**; build guest/Admin đều exit 0. Browser baseline có **12 ca đạt, 3 ca map lỗi**, dừng theo `--max-failures=3`, 9 ca chưa chạy; tiến trình dọn server trong sandbox bị treo và đã dừng bằng Ctrl+C. Không gọi lượt baseline này là suite đạt.

## Thay đổi thực hiện

| Phần | Hành vi sau sửa và bằng chứng |
| --- | --- |
| Bản đồ guest | Ghép lại đủ khóa VI/EN và CSS từ `00f0835`, giữ phần TTS mới. Các ca marker/ID/tọa độ sai, loading/rỗng/API lỗi/retry, tile lỗi/retry, keyboard Enter/Space, summary/detail, 404 sau khi ẩn, không GPS và viewport 390px được kiểm tra trong map.spec và integration.spec. Public filter published giữ nguyên |
| TTS web | Xử lý timer browser đúng ngữ cảnh, lỗi liệt kê giọng/constructor, Stop khi chưa onstart, phản hồi engine cũ, interruption, lỗi Resume và timeout bắt đầu từng đoạn. Giữ giọng khớp locale, văn bản, controls và UI/narration độc lập. 18 test player + ca browser dùng engine giả |
| TTS mobile | Chờ tất cả lệnh native Stop đang chạy trước bài thay thế; bắt Promise rejection của Stop/Pause/Resume, bỏ callback cũ, timeout từng đoạn và xử lý onStopped. Panel lấy ngôn ngữ từ bài có nội dung thực, giữ locale độc lập UI, dừng khi đổi locale/rời component. Giữ Android Stop/Replay và iOS pause/resume khi hỗ trợ. 12 test player mới, 4 component test mới; không coi bundle/Jest là kiểm chứng thiết bị |
| UC12 backend | Nối dependency per-request hiện có, timeout SQLite 10s/FK ON. Include cả route v1 và alias cũ. UUID v4/variant sai trả 422; giữ detail session_revoked cùng envelope lỗi. BEGIN IMMEDIATE và nghiệp vụ An được giữ. Test qua main, không chỉ router rời: trùng heartbeat, biên 30 phút, heartbeat/revoke đồng thời, revoke trước heartbeat, idempotence |
| Retention | Dùng hàm cleanup sẵn có, thêm lifespan dọn startup và lịch mỗi 00:00 Việt Nam; lỗi theo lịch ghi log/thử lại sau 60s. Kiểm tra schema v2 trước khi dọn, không tự migrate. Test startup thật và vòng lịch bằng thời gian tiêm vào với SQLite tạm; chưa quan sát server vận hành qua nhiều ngày |
| UC12 guest | Nối banner/cài đặt VI/EN; vòng đời ở AppLayout để rời Privacy không dừng analytics. Base đúng `/api/v1/analytics`. Mock không sinh/gửi thống kê. Dừng ngay khi rút, giữ mã chờ trước xóa SID, thử lại online/visible/startup/mỗi 30s, khóa đồng ý lại khi chờ. Không chồng request chậm; phản hồi 409/revoke cũ không xóa trạng thái mới; lỗi localStorage dừng gửi và báo rõ |
| UC12 mobile | Đối chiếu thấy adapter vẫn UNSUPPORTED, không gửi HTTP; không mở rộng kết nối trong đợt này. Sửa thông báo UI/tài liệu để nói mobile chưa nối API, không nói backend chưa hỗ trợ. Các privacy unit test mobile vẫn dùng API giả |
| UC07–UC08 | Xác thực, draft mặc định, danh mục/tọa độ/bán kính, locale trùng, rỗng, quyền sở hữu bài, CASCADE và không lộ draft/hidden đều có API test. Admin UI khóa chọn/nhập/hủy trong lúc lưu để response chậm không ghi đè biểu mẫu khác; browser thêm sửa POI/bài, bán kính 1000, lỗi lưu giữ nội dung, hủy/đồng ý xóa |

API mới khả dụng: `POST /api/v1/analytics/heartbeat` và `/revoke`, đều 204 khi thành công; alias `/api/analytics/**` giữ tương thích code An. Heartbeat là khai báo của client sau đồng ý, server không tự xác thực thao tác bấm đồng ý và không có endpoint tạo phiên trước đó. Chưa có rate limiting/CORS khác origin, không mở rộng các phần này trong tác vụ.

**Không đổi schema/migration hoặc dependency/lockfile.** Dùng migration 002 đang có, version 2; database cũ bị chặn startup với hướng dẫn sao lưu/kiểm tra/nâng cấp trong RUNNING. Dấu thu hồi dùng last_seen cũ, cũng bị dọn khi hết cửa sổ giữ dữ liệu; sau đó server không nhớ mã cũ. Đồng ý lại phải dùng UUID mới. Khi API tắt không có lịch ngoài tiến trình, startup sau dọn bù. Không hứa xóa toàn bộ lượt khi rút: lượt được tách mã và giữ để tổng hợp theo BR18.

## Lệnh, môi trường và kết quả thực tế

Windows 11 `10.0.26300`, PowerShell `5.1.26100.9711`; Python `.venv` **3.12.15**, SQLite **3.53.1**, FastAPI **0.115.12**, Starlette **0.46.2**, HTTPX **0.28.1**, Uvicorn **0.34.2**, Pydantic **2.14.2**, tzdata **2026.6**. Node **26.13.0**, npm **11.20.0**; React web **19.3.1**, Vite guest **8.3.5** / Admin **7.3.7**, Vitest **5.1.0**, Playwright **1.64.1**, Edge headless **156.0.4314.58**. Expo SDK **56**, expo-speech **56.0.3**, React Native **0.85.3**. Không nâng dependency.

Các lệnh dưới chạy từ gốc repo trừ export. Kết quả cuối của từng kiểm tra đều có exit 0:

| Lệnh đã chạy | Kết quả cuối | Dữ liệu/giới hạn |
| --- | --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -q` (cũng chạy bản `-v`) | **69/69** | UC05–UC08, public, database/migrations, analytics, main/lifespan, concurrency; SQLite tạm |
| `.\.venv\Scripts\python.exe -m pytest backend/tests/test_analytics.py backend/tests/test_analytics_integration.py -q --basetemp=backend/.pytest-tmp/integration-20261104` | **34/34** | Là các ca đã nằm trong 69 unittest, không cộng trùng. 2 warning: Starlette/AnyIO deprecation và không ghi được cache pytest |
| `npm.cmd --prefix apps/guest-web test` | **25 Node + 20 Vitest** | Fake fetch/voices/storage/visibility/clock; không phải 45 test HTTP thật |
| `npm.cmd --prefix apps/guest-web run build` | Thành công | 54 modules; bundle static, không chứng minh deployment |
| `npm.cmd --prefix apps/admin-web run build` | Thành công | 29 modules; Admin không có script unit test riêng |
| `$env:SAIGON_TEST_REAL_OSM='1'; npm.cmd --prefix apps/guest-web run test:browser -- --reporter=line --output=test-results/integration-20261104-acceptance` | **32/32, 46.7s**, exit 0 | 4 Admin, 8 guest, 7 tích hợp/TTS/UC12, 12 map, 1 chẩn đoán OSM. FastAPI main/SQLite tạm; tile fixture cho các ca chức năng, giọng giả cho ca TTS |
| `npm.cmd --prefix apps/mobile test -- --runInBand` | **83 pass + 2 skip**, 11 suites đạt | Native map/GPS/Expo Speech/AsyncStorage giả lập; 2 ca HTTP opt-in chưa có URL |
| Chạy `serve_api.py` riêng; đặt `SAIGON_TEST_API_URL=http://127.0.0.1:18082/api`, `SAIGON_TEST_FIXTURE=gate2`, cùng lệnh mobile | **85/85**, 12 suites, exit 0 | 2 test HTTP thật tới main/FastAPI/SQLite tạm: public/search/filter/private/narrations; không phải UC12 mobile HTTP |
| Từ `apps/mobile`: `EXPO_NO_TELEMETRY=1`, `EXPO_NO_DOTENV=1`, `CI=1`, `LOG_EVENTS` trỏ file tạm mới; `npx.cmd expo export --platform android --output-dir dist/integration-20261104` | Thành công, **909 modules, HBC ~2.3 MB** | Chỉ export Android, không đọc .env cá nhân, chưa cài/chạy native hoặc build iOS |
| `git diff --check` | Đạt | Có warning LF/CRLF trên một số file, không có whitespace error |

Các lượt lỗi trung gian không bị giấu: một privacy unit test bắt khác biệt khi hiện lại tab, đã sửa xử lý gửi ngay; browser bắt lỗi timer `Illegal invocation` khi gọi native timer với this sai, đã bọc hàm và chạy lại; một kỳ vọng câu validation Admin thiếu từ “các”, sửa câu test theo UI thực tế. Một fixture map thiếu name khi quay lại list gây lỗi PoiCard trong log dù assert route qua; đã bổ sung name/address cho ca chỉ kiểm tra tọa độ sai và thêm kiểm tra pageerror/heading sau quay lại. Không sửa sản phẩm để chiều fixture sai hợp đồng.

Expo lần đầu bị EPERM tại log/output; chạy lại với quyền thực thi cho output/cache đã thành công. Browser sandbox có lượt chạy hết các bước nhưng treo khi dọn tiến trình: đã hủy, không ghi suite PASS; lượt chạy cuối có quyền kết thúc server đạt và thoát 0. Một lượt mobile HTTP bắt đầu khi fixture Playwright vừa kết thúc nên 2 NETWORK_ERROR; đã chạy lại bằng fixture độc lập sống suốt test, đạt 85/85. Không dùng các lỗi môi trường đó để quy kết code sản phẩm.

## OSM thật, mock và phần chưa kiểm thử

Lượt chẩn đoán cuối không chặn OSM: **15 `net::ERR_CONNECTION_REFUSED`, 0 response thành công, 0 ảnh tile**, UI báo lỗi. Test đạt vì kiểm tra chẩn đoán/fallback: 2 marker từ API thật còn dùng được, mở summary/detail và về danh sách, màn hình 390px không tràn ngang. **Không đạt tải nền OSM thật tại mạng của môi trường này**; chưa xác định nguyên nhân ngoài thông báo kết nối, không suy ra dịch vụ OSM bị lỗi toàn hệ thống.

Minh chứng cục bộ (Git ignore): `apps/guest-web/test-results/integration-20261104-acceptance/.last-run.json` có status passed; ảnh [desktop](../../apps/guest-web/test-results/integration-20261104-acceptance/provider-real-OSM-diagnost-1faec--checks-navigation-fallback/osm-desktop.png) và [390px](../../apps/guest-web/test-results/integration-20261104-acceptance/provider-real-OSM-diagnost-1faec--checks-navigation-fallback/osm-mobile-width.png). Đã xem ảnh 390px; ảnh là nền lỗi với marker thật, không phải tile tải thành công. Default browser bỏ qua chẩn đoán OSM; lượt cuối bật opt-in nên không còn ca tự động bị skip. Các ca lỗi mạng dùng abort/HTTP giả, tile chức năng dùng PNG fixture; phân biệt với API thật trong test.

**Chưa kiểm thử** nghe âm thanh thật, chất lượng/phát âm giọng VI/EN, pause/resume trên browser thật có phát âm, điện thoại Android/iOS, native maps/permission/GPS thực địa, iOS bundle/native build. Không có adb/emulator/điện thoại được dùng trong phiên. Cần Thuận ghi thiết bị, OS, hash, locale, tên giọng, người thử và kết quả theo [phiếu Gate 3](../mobile/testing/day3-gate3-tts.md) và [Gate 2 mobile](../mobile/testing/day2-gate2-mobile.md). Không điền PASS thủ công thay nhóm.

## Gate 2 và Gate 3

Đối chiếu Gate 2 theo báo cáo trước và Gate 3 theo phiếu UC03 cùng các UC07–UC08/UC12 trong yêu cầu này. Repo chưa có checklist nghiệm thu Gate 3 tổng thể khác; không suy diễn xác nhận ngoài repo.

| Gate / tiêu chí | Kết luận | Minh chứng / phần còn thiếu |
| --- | --- | --- |
| G2 — Admin đăng nhập/đăng xuất, CRUD danh mục | **Đạt trong kiểm thử tự động** | test_admin_api + admin.spec, kiểm tra quyền/token/lỗi/trùng/NFC/RESTRICT |
| G2 — Guest tìm/lọc/chi tiết và UI VI/EN độc lập bài | **Đạt trong kiểm thử tự động** | public API + guest.spec, API thật/temp SQLite, có FR, 404 draft/hidden |
| G2 — Mobile tìm/lọc/chi tiết | **Đạt logic/HTTP; chưa xác minh trên thiết bị** | Jest + 2 HTTP thật trong 85 ca; chưa chạy native UI |
| G2 — Bản đồ web: marker/summary/detail/keyboard/lỗi | **Đạt với tile fixture** | 12 map + ca tích hợp, không GPS, 404/lỗi/retry |
| G2 — Tải nền OSM thật | **Chưa đạt trong môi trường này** | 15 connection refused, 0 tile thành công; fallback đạt |
| G2 — Bản đồ/GPS mobile thực tế | **Chưa xác minh** | Component/helpers + Android export đạt, không có điện thoại/emulator |
| G3 — UC07 quản lý địa điểm | **Đạt phạm vi không upload trong API/browser** | Draft, validation biên 20/1000, auth, sửa/lưu lỗi/xóa có xác nhận/CASCADE, không lộ public |
| G3 — UC08 quản lý bài | **Đạt trong API/browser** | Bắt buộc title/body, locale trùng/chuẩn hóa, sửa, ownership/404, UI lỗi giữ dữ liệu |
| G3 — UC03 TTS web | **Đạt điều khiển/engine giả; âm thanh thật chưa xác minh** | Unit + Edge, đúng locale, thiếu giọng/lỗi/Stop/Pause/Resume/Replay/đổi bài |
| G3 — UC03 TTS mobile | **Đạt logic/component/bundle; thiết bị/âm thanh chưa xác minh** | NarrationPlayer/Panel tests + Android export; iOS/Android thực tế chờ Thuận |
| G3 — UC12 backend và guest | **Đạt kiểm thử tự động trong phạm vi** | Main routes + SQLite concurrency/retention + browser offline/reload/2 tab; lịch midnight dùng thời gian tiêm, chưa quan sát vận hành dài ngày |
| UC12 mobile giai đoạn tiếp theo | **Chưa đạt tích hợp HTTP mobile** | Adapter UNSUPPORTED; không mở rộng ngoài phạm vi mục tiêu ngày 03/11, nhóm đối chiếu kế hoạch 04/11 |

Upload ảnh ngoài phạm vi đánh giá. Không đánh dấu toàn bộ Gate 2/Gate 3 đã nghiệm thu khi nền OSM, thiết bị và âm thanh thật còn thiếu.

## Bàn giao cho nhóm

- **Nguyên:** review UC07–UC08 và cơ chế khóa biểu mẫu lúc lưu; kiểm thử chéo UI/API bằng DB tạm. Upload ảnh vẫn là việc riêng, chưa triển khai. UC09 công bố/ẩn là phụ thuộc khi muốn đưa nội dung đã duyệt vào Public, không có endpoint mới trong đợt này.
- **An:** review alias/204/error tương thích, cơ chế heartbeat/revoke/retention, kiểm tra log/lịch trong môi trường triển khai. Chốt lại TTL dấu thu hồi nếu muốn chặn mã cũ lâu hơn cửa sổ 30 ngày; rate limiting/dashboard chưa thuộc đợt này. Khi đến phần mobile, nối adapter và test UC12 HTTP thật, foreground/NetInfo, lưu/gửi lại revoke; hiện chưa gửi/rút server thành công.
- **Thuận:** nghe trực tiếp VI/EN trên web và Android/iOS, ghi tên giọng/thiết bị/OS; thử bài dài, thiếu giọng, pause/resume hoặc Stop/Replay, đổi bài/rời trang. Chạy checklist map/GPS foreground trên điện thoại; thử tile OSM bằng mạng truy cập được, giữ attribution và không thêm offline/GPS nền.

Không chỉnh bảng phân công hoặc tự ghi nhóm đã phê duyệt. Sau review nhóm tự commit/push/merge nếu muốn. Không đưa .env, token, mật khẩu thật, database, node_modules, output build/test hoặc dữ liệu cá nhân vào Git.

## Danh sách file thay đổi

Mọi đường dẫn dưới là nguồn/tài liệu; không có schema/migration, lockfile hoặc dữ liệu vận hành. Danh sách đầy đủ gồm cả báo cáo này:

Rà soát cuối: **45 file, 37 sửa và 8 mới**, không file bị xóa, chưa stage. Manifest khớp hoàn toàn `git diff --name-only` cộng `git ls-files --others --exclude-standard`; liên kết local của các tài liệu thay đổi đều tồn tại. Không phát hiện conflict marker, ký tự thay thế lỗi mã hóa hoặc output/database/.env trong danh sách thay đổi. HEAD vẫn `97e1ad6`, nhánh vẫn `main`; `git diff --check` đạt. Server fixture đã dừng sau kiểm thử.

```text
README.md
RUNNING.md
apps/admin-web/src/features/admin/places/Places.jsx
apps/guest-web/README.md
apps/guest-web/src/components/AppLayout.jsx
apps/guest-web/src/features/privacy/ConsentBanner.jsx
apps/guest-web/src/features/privacy/PrivacySettings.jsx
apps/guest-web/src/features/privacy/analyticsClient.js
apps/guest-web/src/features/privacy/analyticsClient.test.js
apps/guest-web/src/features/privacy/privacy.css
apps/guest-web/src/features/privacy/useAnalyticsConsent.js
apps/guest-web/src/i18n/translations.js
apps/guest-web/src/pages/PrivacyPage.jsx
apps/guest-web/src/styles/global.css
apps/guest-web/src/tts/webSpeechPlayer.js
apps/guest-web/tests/admin.spec.js
apps/guest-web/tests/guest.spec.js
apps/guest-web/tests/integration.spec.js
apps/guest-web/tests/map.spec.js
apps/guest-web/tests/provider.spec.js
apps/guest-web/tests/serve_api.py
apps/guest-web/tests/support/speech.js
apps/guest-web/tests/webSpeechPlayer.test.js
apps/mobile/README.md
apps/mobile/src/context/translations.js
apps/mobile/src/features/narration/NarrationPanel.js
apps/mobile/src/features/narration/NarrationPlayer.js
apps/mobile/tests/narration/NarrationPanel.test.js
apps/mobile/tests/narration/NarrationPlayer.test.js
apps/mobile/tests/narration/narrationUtils.test.js
backend/README.md
backend/app/api/routes/analytics.py
backend/app/db/connection.py
backend/app/main.py
backend/app/schemas/analytics.py
backend/app/services/analytics_retention.py
backend/tests/test_admin_pois.py
backend/tests/test_analytics_integration.py
backend/tests/test_startup.py
docs/API_CONTRACT.md
docs/analysis-design/api-analytics.md
docs/analysis-design/api-design.md
docs/mobile/testing/day3-gate3-tts.md
docs/testing/integration-2026-11-04.md
docs/testing/test-results.md
```
