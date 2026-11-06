# Bàn giao tích hợp và chuẩn bị demo 07/11/2026

**Cập nhật sau commit `4723a49`:** bản đồ web đã có nguồn tile dự phòng và đã tải được ảnh thật trên máy kiểm tra. Bộ kiểm thử hiện tại đạt 89 backend, 25 Node + 20 Vitest guest, 37 browser + 1 chẩn đoán mạng bỏ qua, 120 mobile Jest + HTTP fixture; hai web build đạt. Xem [biên bản nghiệm thu kỹ thuật mới](acceptance-readiness-2026-11-06.md). Các số liệu, trạng thái F02 và hạn chế tile bên dưới ghi lại mốc trước khi sửa bản đồ; không dùng chúng làm kết luận hiện tại cho web.

Ngày kiểm tra: **06/11/2026, giờ Việt Nam (UTC+7)**. Người thực hiện kiểm thử tự động: Codex; chưa có xác nhận nghiệm thu hoặc chữ ký của Nguyên, An, Thuận. Báo cáo áp dụng cho working tree chưa commit trên nền `48a0908a5624e4a5202fc9417968e5f3f382b170`.

## 1. Phiên bản và phạm vi an toàn

Ban đầu nhánh `main`, HEAD `48a0908a5624e4a5202fc9417968e5f3f382b170`, `git status --porcelain=v1` rỗng. Không có thay đổi người dùng cần ghi đè. `git ls-remote origin HEAD refs/heads/main` không kết nối được github.com:443; sau đó GitHub connector `fetch_commit(main)` xác nhận [remote main cùng commit](https://github.com/Domyan-nn/nhom12_Quan1Tourism/commit/48a0908a5624e4a5202fc9417968e5f3f382b170). Không fetch/merge/pull, không đổi nhánh.

Đã đọc metadata và các vùng giới hạn của [bảng phân công](https://docs.google.com/spreadsheets/d/1hdMdbPlwHLsS_RjhKd6KB-FHDxpiPrEEGXnU7M0PWGo/edit): tab 2 A1:P100 (13 WBS), tab 4 A1:P90 (20 tiêu chí), tab 5 A1:K65 (minh chứng). Bảng vẫn ghi 0/13 WBS xong, 0/20 tiêu chí đạt; đây là trạng thái nhóm ghi, không bị tự cập nhật. Đường dẫn `web/`/`mobile/` và ghi chú UC12 mobile chưa nối còn cũ so với apps/ và commit 48a0908.

Đọc README/RUNNING, API contract, migration/seed, tài liệu phân tích/triển khai/test lịch sử; trích văn bản Word qua XML và đọc sơ đồ DOT. Chưa mở Word bằng trình soạn thảo để kiểm tra bố cục, chưa sửa file Word, render lại sơ đồ, làm slide hoặc quay video. Các báo cáo 02–04/11 giữ nguyên như lịch sử, không dùng làm kết quả hiện tại.

Mọi API/seed/backup/restore/publish trong kiểm thử dùng **database tạm tự tạo**, không mở hay thay database cá nhân/demo hiện có, không áp migration lên nguồn thật. Không công bố placeholder từ seed. Chỉ công bố POI tổng hợp tự tạo trong fixture. Upload ảnh **tạm gác**; giữ image_url hiện có. Không sửa bảng phân công, commit, stage, push hoặc merge; không thêm dịch vụ/khóa trả phí, offline hay GPS nền.

## 2. Bảng kiểm tra trước sửa

| UC / WBS / người chính | Code ban đầu và tích hợp | Bằng chứng có trước / baseline mới | Thiếu sót xác nhận và việc cần nghiệm thu |
| --- | --- | --- | --- |
| UC05 / WBS03 / Nguyên | Auth router/main và Admin có login/logout | Backend auth + browser lịch sử; baseline backend 79 pass | Kiểm lại token/khóa/hết hạn; không phát hiện lỗi cần viết lại. |
| UC06 / WBS04 / Nguyên | CRUD song ngữ, trim/NFC/casefold, RESTRICT đã tích hợp | Test backend/database/category + browser | Không collapse whitespace nội bộ theo quy tắc repo; dữ liệu cũ thiếu EN dùng VI. |
| UC07–08 / WBS05–06 / Nguyên | Form POI và bài, draft/validation/CASCADE đã có | Backend/admin browser lịch sử; build Admin baseline exit 0 | Giữ URL ảnh, upload tạm gác. Cần kiểm thử chéo trạng thái công khai. |
| UC09 / WBS06 / Nguyên, An phối hợp | Backend publish/hide đã có, UI chưa có controls | test_day4 có API publish/hide | API client bỏ error.details; publish legacy kiểm tra bài chưa đủ chặt, chuyển trạng thái chưa khóa giao dịch. Thêm UI và test chéo API Public. |
| UC01 / WBS07 / An | Guest tìm/lọc/detail, API published, mobile adapter đã nối | Public backend; guest 25 Node +20 Vitest; mobile baseline 89 pass +2 HTTP skip | Kiểm HTTP và responsive cuối, không tự fallback mock. |
| UC02 / WBS10 / Thuận | Leaflet/OSM web và native map tích hợp | Marker/helper/browser fixture có sẵn | Tải tile OSM thật phải thử lại; native map/GPS chưa có thiết bị. |
| UC03 / WBS11 / Thuận | Web Speech và Expo Speech dùng bài database | Browser baseline 29 pass/2 fail/1 skip | Hai assertion về phát tiếp/giọng đến muộn sau khi rời trang thất bại; cần kiểm cleanup và thời điểm route commit. Âm thanh thật chưa nghe. |
| UC04 / WBS12 / Thuận | Engine BR08 và foreground watcher gắn vào app | Jest engine/watcher, export lịch sử | Mẫu có tọa độ ngoài miền hoặc accuracy âm chưa bị loại. Thực địa/cooldown/giọng cần điện thoại. |
| UC10–11 / WBS09 / An | Stats router/main và Dashboard Admin đã tích hợp | test_day4 + build Admin | Cùng mốc giờ khi đổi ngày VN, hủy request cũ, xóa dữ liệu khoảng lọc cũ và tránh callback làm reset polling; cần browser 30s/lỗi/biên. |
| UC12 / WBS08 / An + Thuận | Router main + guest banner/settings + mobile API thật từ 48a0908 | Backend analytics 34 pytest; guest privacy20; mobile có adapter tests | Mobile cho đồng ý lại khi pending revoke, thiếu retry định kỳ, guard/race/storage chưa đủ. Tài liệu ghi chưa nối là sai hiện trạng. |
| NFR05–08 / WBS01–02,13 / cả nhóm | Seed có 2 danh mục, 5 nháp, 6 bài placeholder, không ảnh; docs backup/demo mới khung | Test database/seed lịch sử | Cần nội dung/ảnh được duyệt, backup/restore thực thi trên tạm, NFR08 20 HTTP, checklist demo/Word/sơ đồ/video. |

## 3. Các sửa lỗi và tích hợp

**Nguyên (UC05–09, WBS01/03–06):** giữ auth/category/CRUD đang đúng. Thêm Công bố/Ẩn VI/EN và xác nhận chỉ nội dung đã duyệt; hiện lý do trường thiếu qua error.details. Publish tái dùng validator để loại locale/bài legacy sai, Unicode whitespace và radius không nguyên; `BEGIN IMMEDIATE` bảo vệ kiểm tra/chuyển trạng thái trước request đồng thời. `start_demo.py` bắt buộc `--database`, bỏ tên preview cá nhân cố định, hỗ trợ host/port và từ chối nguồn không có. Thêm backup snapshot vào tệp mới, integrity/FK checks và rehearsal restore.

**An (UC01/10–12, WBS07–09):** stats dùng cùng mốc now để xác thực range và tính ngày; Dashboard hủy request cũ khi tải mới/rời trang, không giữ số liệu filter cũ trong lúc chờ, hiển thị giờ VN và callback hết phiên ổn định. Browser kiểm real HTTP publish/hide, hôm nay/7 ngày/khoảng lọc, 30 giây polling, lỗi khác 0. NFR08 có script tái lập và bảng từng request bên dưới.

**Thuận (UC02–04, WBS10–12), phối hợp An cho UC12:** TTS web hủy đồng bộ trong layout cleanup khi đổi bài/rời trang, chặn callback giọng đến muộn. Mobile loại tọa độ GPS sai/accuracy âm. Analytics mobile giữ pending revoke trước khi xóa phiên, khóa đồng ý lại, thử lại mỗi 30 giây khi foreground/online, tuần tự hóa lưu trữ, không gửi heartbeat chồng/ngoài running và không để 409 cũ tắt phiên mới. AppState/NetInfo không mặc định có mạng khi chưa biết; storage lỗi dừng gửi và thông báo VI/EN. Thêm kiểm UI và HTTP thật cho UC12. Không thay đổi UI thành nhiều hơn VI/EN, không đổi locale bài theo UI, không thêm dịch/tạo nội dung.

**Endpoint/schema:** không thêm/đổi endpoint, body/response hay schema/migration; database hiện cần analytics v2 + danh mục song ngữ. Vẫn dùng publish/hide và stats có sẵn; chỉ siết kiểm tra publish và tính thời gian. Thay đổi CLI có chủ ý: `start_demo.py` nay bắt buộc `--database`. Hợp đồng và [từ điển dữ liệu](../analysis-design/data-dictionary.md) đã đồng bộ.

## 4. Môi trường, lệnh và kết quả

Windows 11 `10.0.26300`, PowerShell; Python venv **3.12.15** (Python global 3.15.2 không dùng cho API), SQLite **3.53.1**, FastAPI **0.115.12**, Starlette **0.46.2**, HTTPX **0.28.1**, Uvicorn **0.34.2**, Pydantic **2.14.2**, tzdata **2026.6**, pytest **8.4.2**. Node **26.13.0**, npm **11.20.0**, Vite Admin **7.3.7**, guest **8.3.5**, Vitest **5.1.0**, Playwright **1.64.1**, Edge **157.0.4341.42**, Expo SDK **56**. Không nâng dependency hoặc lockfile.

Các lệnh chạy từ gốc trừ khi ghi khác. PASS dưới đây chỉ khi tiến trình đã có exit 0; không cộng trùng pytest analytics với unittest hoặc mobile unit với cùng test trong HTTP run.

| Kiểm tra / lệnh | Trước sửa | Kết quả cuối và phạm vi |
| --- | --- | --- |
| `.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v` | 79 pass, exit 0,21.976 giây | **89/89**, exit 0; root chạy lại 24.879 giây. SQLite tạm, TestClient/main/lifespan, auth/categories/POI/bài/status/stats/analytics/retention/schema/backup/start_demo. |
| `.\.venv\Scripts\python.exe -m pytest backend/tests/test_analytics.py backend/tests/test_analytics_integration.py -q --basetemp=backend/.pytest-tmp` | 34 pass,exit 0,2.69 giây | 34 ca nằm trong full unittest cuối. Cảnh báo deprecation Starlette/AnyIO và cache ACL; không phải lỗi test. |
| `npm.cmd --prefix apps/admin-web run build` | exit 0 | exit 0 sau sửa, Vite 7.3.7; build không phải nghiệm thu chức năng. |
| `npm.cmd --prefix apps/guest-web test -- --configLoader runner` | 25 Node +20 Vitest pass | **25+20**, exit 0 sau sửa. Fake fetch/speech/storage/clock. `npm test` mặc định baseline bị EPERM .vite-temp; runner tránh cache loader bị chặn. |
| Từ guest: `npm.cmd run build -- --configLoader runner --outDir <TEMP-mới>` | dist và dist/subdir EPERM | Final build ra TEMP GUID exit 0; không thay cấu hình sản phẩm chỉ để xử lý ACL. |
| Browser mặc định baseline `npm.cmd run test:browser` (output TEMP) | 29 pass,2 fail UC03,1 skip; exit 1 | Teardown chờ đến khi dừng đúng server test; không ghi baseline suite PASS. Hai assertion UC03 thất bại; có race nếu đo ngay sau click trước route commit. |
| Browser cuối với 4 dịch vụ riêng + config tạm `webServer:undefined` | — | **36 pass, 1 OSM opt-in skip, exit 0**, 59.8 giây; backend đã restart theo code cuối. Thêm 5 ca UC09/stats/responsive; test UC03 đồng bộ route commit. Lệnh tái lập ở mục 5. |
| Browser real OSM opt-in, `--grep 'real OSM diagnostic'` | Không suy từ lịch sử | 1 diagnostic PASS/exit 0; **0 tile 2xx,15 ERR_CONNECTION_REFUSED,0 ảnh tile**. Chỉ xác minh fallback/navigation; chưa đạt tải tile thật tại môi trường này. |
| `npm.cmd --prefix apps/mobile test -- --runInBand` không URL test | 89 pass, 2 HTTP skip, exit 0 | **116 pass, 4 HTTP skip**, 15 suite pass/1 skipped, exit 0, 5.436 giây. GPS/map/TTS/storage/time giả lập. Có lượt regression trước sửa tái hiện 6 lỗi UC12. |
| Cùng lệnh mobile với `SAIGON_TEST_API_URL=http://127.0.0.1:18083/api`, `SAIGON_TEST_FIXTURE=gate2` và fixture riêng | — | **120/120**, 16 suite, exit 0, 5.546 giây; 2 HTTP public + 2 HTTP analytics. Main FastAPI/SQLite tạm; timer/storage/native vẫn giả lập; mất mạng được tiêm lỗi rồi retry HTTP thật. |
| Từ mobile: `npx.cmd expo config --type public --json` | exit 0 | exit 0, chỉ quyền vị trí foreground; không background location. |
| Từ mobile: `npx.cmd expo export --platform android --output-dir dist/handoff-mock-final-20261106` | EPERM export.log | Final exit 0, 919 modules, 7.935 giây, HBC ~2.3MB; dùng LOG_EVENTS tệp TEMP mới, EXPO_NO_TELEMETRY=1, EXPO_NO_DOTENV=1, CI=1 và quyền ghi cache/output. Không đọc .env cá nhân. Không phải native install/build APK hay iOS export. |
| `.\.venv\Scripts\python.exe docs/testing/tools/verify_handoff.py` | Chưa có | exit 0: init/seed, snapshot/restore bằng bảy bảng/version, login HTTP thật, seed draft không lộ Public; 20 HTTP NFR08 đạt. Nguồn hoàn toàn tạm. |
| `git diff --check` | Sạch | exit 0 sau sửa; chỉ LF/CRLF warnings. Rà danh sách thay đổi để loại secret/.env/database/node_modules/output. |

Không có adb trên PATH, không dùng điện thoại/emulator. Chưa nghe âm thanh thật, thử bản đồ native, GPS di chuyển/cấp quyền thực, iOS native/export hoặc quan sát retention qua nhiều ngày. Scheduler/biên 30 ngày/startup có test thời gian tiêm và dữ liệu tạm; không thay thế kiểm chứng vận hành dài ngày.

Rà soát cuối bổ sung regression cho hai lỗi UI storage (grant thất bại không giữ trạng thái đã đồng ý/đóng modal; decline thất bại không báo đã lưu), và lỗi chuyển chế độ mock có thể làm mất pending revoke thật. Mock nay không tạo mã/gửi heartbeat/xác nhận revoke; adapter báo UNSUPPORTED khi gọi nhầm, pending giữ đến lúc trở lại API thật và có xác nhận server. Các test client/provider/modal/screen mới đã nằm trong kết quả 120 ở trên.

### NFR08 — 20 yêu cầu liên tiếp, HTTP thật

Lượt cuối **15:56:28 ngày 06/11/2026 UTC+7**, cùng HEAD + working tree. Uvicorn1 worker/loopback, FastAPI main, SQLite tạm từ schema mới, 2 danh mục,10 POI (5 seed draft +5 test tổng hợp published),11bài; API list trả đúng5. Đã login và chuẩn bị fixture trước đo, không retry20 request, đo tới lúc đọc/parse response. Không tính bản đồ/TTS hoặc thời gian khởi động; không có tải đồng thời.

| Request | ms | HTTP / số POI / thành công <3s |
| --- | ---: | --- |
| 1 | 6.064 | 200 /5 /Có |
| 2 | 6.497 | 200 /5 /Có |
| 3 | 4.234 | 200 /5 /Có |
| 4 | 5.546 | 200 /5 /Có |
| 5 | 4.894 | 200 /5 /Có |
| 6 | 27.107 | 200 /5 /Có |
| 7 | 16.999 | 200 /5 /Có |
| 8 | 29.884 | 200 /5 /Có |
| 9 | 17.231 | 200 /5 /Có |
| 10 | 5.157 | 200 /5 /Có |
| 11 | 5.107 | 200 /5 /Có |
| 12 | 10.837 | 200 /5 /Có |
| 13 | 7.184 | 200 /5 /Có |
| 14 | 4.358 | 200 /5 /Có |
| 15 | 4.768 | 200 /5 /Có |
| 16 | 21.593 | 200 /5 /Có |
| 17 | 5.499 | 200 /5 /Có |
| 18 | 4.933 | 200 /5 /Có |
| 19 | 22.051 | 200 /5 /Có |
| 20 | 31.684 | 200 /5 /Có |

**20/20 thành công dưới3giây**, đáp ứng ngưỡng≥19/20 trong môi trường và dữ liệu trên. Không suy rộng sang concurrent load/LAN/production. Script tái lập nằm ở `docs/testing/tools/verify_handoff.py`; JSON stdout không chứa password/token.

### Cài sạch trong thư mục tạm

Admin và guest: tạo hai thư mục TEMP mới, ban đầu chỉ copy package.json/package-lock.json. Chạy `npm.cmd ci --offline --no-audit --no-fund`: Admin 17 packages/exit 0/~2 giây, guest 86 packages/exit 0/~4 giây. Sau đó mới copy src/index.html/vite.config.js, không copy .env/node_modules; Admin `npm.cmd run build -- --configLoader runner` exit 0/~1.14 giây, guest `npm.cmd run build` exit 0/~355 ms. Dùng cache npm hiện có, không phải kiểm chứng tải từ registry hoặc máy Windows mới. Admin build mặc định ở TEMP ban đầu bị esbuild ACL đọc thư mục cha; runner khắc phục. Có warning npm11 về esbuild postinstall/allowScripts nhưng build cuối đã exit 0. Một wrapper log guest đầu bị encoding cp1258, đã chạy lại UTF8 và exit 0; không ghi lỗi wrapper thành lỗi sản phẩm.

Backend: tạo venv sạch exit 0; `<venv-mới>/Scripts/python.exe -m pip install --no-index --disable-pip-version-check --no-input -r backend/requirements-dev.txt` exit 1 vì không có distribution offline `fastapi==0.115.12`. Không sửa venv đang dùng hoặc tự truy cập mạng để lấp kết quả. Cài backend sạch, cài mobile sạch và cài mới toàn hệ thống trên máy khác **chưa xác minh**. Các thư mục tạm đã dọn.

## 5. Tái lập browser cuối và nguồn minh chứng

Do ACL output và teardown mặc định chờ trong môi trường thực thi, lần cuối chạy bốn dịch vụ riêng, không báo cấu hình browser mặc định đã exit 0. Có thể tái lập bằng mỗi dịch vụ trong một PowerShell riêng; khi xong Ctrl+C đúng cửa sổ dịch vụ, không dừng tiến trình của người dùng khác.

Backend fixture từ gốc repo (tự tạo DB mới trong TEMP):

```powershell
.\.venv\Scripts\python.exe -u apps/guest-web/tests/serve_api.py
```

Guest mock từ `apps/guest-web`:

```powershell
$env:VITE_USE_MOCK = 'true'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port 18173 --strictPort
```

Guest API thật từ `apps/guest-web`:

```powershell
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port 18174 --strictPort
```

Admin từ `apps/admin-web`:

```powershell
node node_modules/vite/bin/vite.js --config ../guest-web/tests/admin-vite.config.js --configLoader runner --host 127.0.0.1 --port 18175 --strictPort
```

Tạo tệp **mới**, không ghi đè file sẵn có, `apps/guest-web/acceptance-run.config.js`:

```javascript
import config from './playwright.config.js';
export default { ...config, webServer: undefined, globalTimeout: 180000 };
```

Từ `apps/guest-web`, shell mới không đặt SAIGON_TEST_REAL_OSM:

```powershell
npm.cmd run test:browser -- --config acceptance-run.config.js --reporter=line --output="$env:TEMP/saigon-browser-final-$([guid]::NewGuid().ToString('N'))"
```

Muốn chẩn đoán OSM thật, vẫn trên fixture đang chạy:

```powershell
$env:SAIGON_TEST_REAL_OSM = '1'
npm.cmd run test:browser -- --config acceptance-run.config.js --reporter=line --output="$env:TEMP/saigon-osm-$([guid]::NewGuid().ToString('N'))" --grep 'real OSM diagnostic'
Remove-Item Env:SAIGON_TEST_REAL_OSM
```

Xóa riêng config tạm do mình tạo khi xong, dừng đúng bốn dịch vụ. Trong phiên đã xóa config tạm, dừng các PID test đã xác minh và kiểm tra không còn listener tại 18082/18173/18174/18175; không lưu PID cũ thành hướng dẫn dùng lại.

Output cục bộ của full cuối: `%TEMP%\saigon-browser-committed-2832323f9bcd442b98f0e6128a0081b9`, có6ảnh map/Admin tại 375/768/1440; đã xem trực quan hai ảnh375px. Ca responsive kiểm cards/narration/privacy settings/marker/tile/Dashboard đã tải, VI/EN và không tràn ngang; loading/empty/error có ca chức năng tại viewport mặc định, **chưa kiểm tra từng trạng thái tại cả ba breakpoint**. Screenshot, bundle và log nằm ngoài thay đổi Git, có thể không còn trên máy khác.

Phân loại chứng cứ: backend TestClient gọi FastAPI main nhưng không đi qua socket; browser/mobile HTTP và verify_handoff đi qua Uvicorn thật/SQLite tạm. Public fixture có2 published / 1 draft / 1 hidden và VI/EN/FR; UC09 test tự tạo POI riêng rồi xóa. TTS engine/native GPS/map/AsyncStorage và timer là mock, tile chức năng dùng PNG 1px. Lỗi mạng/500 được tiêm có chủ ý. OSM diagnostic không mock tile nhưng kết nối bị từ chối; không kết luận OSM lỗi toàn hệ thống. Hai HTTP analytics mobile đọc trạng thái persisted thật qua route fixture-only, không tồn tại trong API vận hành.

Có lượt browser trung gian **35 pass, 1 fail, 1 skip, exit 1**: phép đo ngay sau click sang Privacy xảy ra trước khi React commit route. Test cuối đợi heading/tts unmount và locale được chọn trước khi đo hoặc tiêm callback giọng đến muộn. Code tăng cường hủy đồng bộ bằng layout cleanup; không khẳng định hai assertion baseline đều là lỗi âm thanh thực tế.

## 6. Nghiệm thu F01–F12 và NFR01–NFR08

Trạng thái đúng ba mức yêu cầu. “Đạt trong phạm vi kiểm tra” chỉ là kết luận kỹ thuật theo bằng chứng dưới, không thay nhóm ký nghiệm thu hoặc nghiệm thu native/production.

| Mã | Trạng thái | Bằng chứng | Giới hạn / việc còn lại |
| --- | --- | --- | --- |
| F01 | Đạt trong phạm vi kiểm tra | test_public_api, guest.spec, mobile HTTP; published/search Unicode NFC+casefold/phân biệt dấu/filterAND/detail404, empty/network/retry | Native UI chưa chạy; không mặc định coi tìm không dấu tương đương có dấu. |
| F02 | Chưa đạt | map.spec/marker helpers/responsive; real OSM diagnostic0 tile 2xx/15 ERR_CONNECTION_REFUSED | Chức năng web đạt với tile fixture; cần mạng tải tile thật và native map/permission trên điện thoại. |
| F03 | Chưa xác minh | Web speech unit/integration, mobile NarrationPlayer/Panel; cleanup đồng bộ và test theo route commit đã qua browser | Điều khiển/đúng locale/thiếu giọng đã thử engine giả, chưa nghe âm thanh hoặc xác minh giọng thực tế. |
| F04 | Chưa xác minh | Mobile engine/watcher BR08 freshness/accuracy/dwell/tie/cooldown/hysteresis/lifecycle; loại GPS sai | Cần điện thoại thực địa, quyền/watchers foreground và TTS thật; test engine không thay thế. |
| F05 | Đạt trong phạm vi kiểm tra | test_admin_api + admin.spec; valid/wrong/locked/missing/invalid/expired/revoked/logout | Không phải đánh giá bảo mật triển khai Internet. |
| F06 | Đạt trong phạm vi kiểm tra | Category API/DB/browser: create/edit/delete/empty/NFC+casefold duplicate/RESTRICT/fallbackVI | Không tự dịch dữ liệu cũ; nhóm duyệt tên VI/EN. |
| F07 | Đạt trong phạm vi kiểm tra | test_admin_pois/admin.spec; draft, biên lat/lon/radius20–1000, save error, confirm delete/CASCADE | Upload ảnh tạm gác; giữ URL, không báo upload đạt. |
| F08 | Đạt trong phạm vi kiểm tra | API/browser UNIQUE(poi_id, locale)/required/ownership/404; VI/EN/FR và UI độc lập locale | Chất lượng nội dung và bản dịch chưa được duyệt. |
| F09 | Đạt trong phạm vi kiểm tra | test_day4 legacy/race + acceptance.spec publish thiếu bài→có bài FR→published→hidden, Public list/detail 200/404 | Chỉ POI test; không duyệt/công bố nội dung thật. |
| F10 | Đạt trong phạm vi kiểm tra | test_day4 nửa đêm VN/30 ngày + analytics retention + dashboard HTTP/range/error;0 khác Không khả dụng | Clock/scheduler được tiêm; chưa quan sát vận hành 30 ngày. |
| F11 | Đạt trong phạm vi kiểm tra | test_day4 biên đúng 90 giây/tương lai/thu hồi + browser refresh 30 giây/error | Timer giả; là số phiên ước lượng, không phải số người duy nhất. |
| F12 | Đạt trong phạm vi kiểm tra | Backend main/race/revoke/idempotency; web cross-tab/pending/offline; mobile có HTTP analytics thật | Storage/network/native lifecycle một phần giả lập; điện thoại cần test; chưa xác minh mọi trường hợp OS đóng ứng dụng lúc ghi storage. |
| NFR01 | Đạt trong phạm vi kiểm tra | Auth/hash/token/locked/expiry/revoke tests, response validation không echo password, rà diff | PBKDF2-SHA256, 600.000 vòng, không phải bcrypt như phương pháp ví dụ trong bảng. Chưa pentest/rate-limit/HTTPS công khai; không có secret thật trong diff. |
| NFR02 | Đạt trong phạm vi kiểm tra | Browser API/tile/TTS failure/retry/list/text; mobile exceptions mock và OSM thật fallback | Native GPS/map/audio failure cần thiết bị; không tuyên bố offline. |
| NFR03 | Đạt trong phạm vi kiểm tra | test_database/migrations/category/admin_pois; FK ON, UNIQUE, CHECK, RESTRICT/CASCADE,legacy publish validators | Dữ liệu SQL cũ vẫn cần kiểm; không áp migration nguồn thật. |
| NFR04 | Đạt trong phạm vi kiểm tra | acceptance.spec tại 375/768/1440,guest list/map/detail/privacy + Admin, VI/EN, 6 ảnh | Kiểm viewport browser; chưa mọi trạng thái ở từng breakpoint hoặc mọi thiết bị/browser. |
| NFR05 | Chưa đạt | Seed tạm: 2 danh mục, 5 bản nháp, 6 bài placeholder,1 POI có vi và en,5 image_url NULL | Cần Nguyên/An duyệt nội dung/tọa độ/nguồn/URL ảnh; upload vẫn tạm gác. |
| NFR06 | Chưa xác minh | RUNNING/setup/demo/backup/data dictionary mới; backup/restore HTTP thật; clean web install+build từ cache | Backend venv sạch thiếu gói offline; chưa cài toàn bộ/máy Windows mới, Word chưa cập nhật layout. |
| NFR07 | Chưa xác minh | Phiếu mobile-field-test 22 ca và Gate2/3 để trống kết quả thực địa | Không điện thoại/emulator, nghe thật hoặc video demo. |
| NFR08 | Đạt trong phạm vi kiểm tra | verify_handoff 20/20 HTTP 200, đúng 5 POI, <3 giây; từng thời gian mục 4 | Chỉ 5 published/loopback/1 worker/yêu cầu tuần tự, không concurrent load. |

Không đánh dấu toàn bộ dự án đã nghiệm thu: còn thiếu tile thật, thiết bị/âm thanh, nội dung demo được duyệt, cài backend sạch và Word/sơ đồ/video.

## 7. Việc còn lại và đề xuất bảng phân công (không tự sửa)

Mọi hàng đề xuất dùng nền commit 48a0908 + **working tree chưa commit**, người kiểm tra hiện là Codex tự động; cột người duyệt nhóm để trống cho Nguyên/An/Thuận tự xác nhận. Không gán ngày xong/giờ thực tế hoặc chữ ký thay thành viên.

| WBS | Người chính | Trạng thái đề xuất | Bằng chứng / việc chốt |
| --- | --- | --- | --- |
| 01 | Nguyên | Chờ review | Monorepo apps/, schema 7 bảng / migration 2 / contract; backend 89 test đạt. Cần cài backend/máy mới và review từ điển. Không nói đã có CI khi chưa kiểm workflow. |
| 02 | Nguyên + An | Đang thực hiện | Seed số lượng đạt nhưng draft/placeholder/không ảnh; cần duyệt nội dung/tọa độ/địa chỉ/nguồn/URL ảnh. Ghi upload tạm gác. |
| 03 | Nguyên | Chờ review | Auth API/browser đạt scope, nhóm review bảo mật và demo login/logout. |
| 04 | Nguyên | Chờ review | CRUD NFC / VI-EN / RESTRICT có API/browser, nhóm duyệt tên/bản dịch. |
| 05 | Nguyên | Chờ review trong phạm vi không upload | Draft/validation/CASCADE+browser đạt; giữ URL; nội dung ảnh và upload chưa nghiệm thu. |
| 06 | Nguyên, An hỗ trợ | Chờ review | Narration/status legacy + race + UC09 browser/API thật đã qua; chỉ công bố dữ liệu nhóm duyệt. |
| 07 | An | Chờ review | Guest/mobile HTTP search/filter/detail; responsive 375/768/1440 web, native UI chưa thử. |
| 08 | An + Thuận | Chờ review tích hợp; chờ thiết bị | Mobile đã nối từ 48a0908 và có HTTP analytics, pending/retry/storage đã sửa. Retention giả lập/startup đạt, chưa vận hành dài ngày. |
| 09 | An | Chờ review | Dashboard HTTP thật,biên VN / 30 ngày / 90 giây / refresh 30 giây / lỗi qua; nhóm thử dữ liệu demo. |
| 10 | Thuận | Đang thực hiện | Marker/navigation/fallback có test; tile OSM thật chưa đạt, native map chưa thử. |
| 11 | Thuận | Đang thực hiện | TTS giả lập/locale/control và cleanup qua; cần giọng/âm thanh Android/iOS/browser thật. |
| 12 | Thuận | Đang thực hiện | BR08 engine/watchers và GPS sai có test; còn foreground/accuracy/dwell/cooldown thực địa. |
| 13 | Cả ba | Đang thực hiện | Markdown bàn giao/demo/backup/data dictionary đã có; Word/UML/slide/video và biên bản thành viên còn thiếu. |

Nguyên: đối chiếu PRD I/II/5.2 Admin, BR03–04/06/09–12,NFR01/03/05/06; Activity UC05–09 và bảng 7.1.1–7.1.5, khôi phục DB. An: PRD III/IV/5.1/5.4, BR01–02/13–19,NFR04/08,Use Case/Activity UC01/10–12, bảng analytics và số đo NFR08. Thuận: PRD khách,BR05/07–08,NFR02/07,Activity UC02–04 và phiếu thiết bị/video.

Word bìa còn chỗ trống trường/khoa/giảng viên/nhóm/MSSV; cần nhóm điền dữ liệu thật, không tự suy đoán. Bản trích XML có đoạn thiếu chữ SQLite; cần kiểm tra bản hiển thị trước khi coi là lỗi Word. Component/deployment DOT hiện có poi-media/IImageStore dù chưa có upload, deployment thiếu đường Admin→API; dùng tên logic saigon-api/mobile-app thì phải ánh xạ backend/apps/mobile. Ghi HTTPS là mục tiêu triển khai và HTTP loopback/LAN là cấu hình demo, SQLite là tệp nhúng không có cổng DB. Chưa sửa hoặc xác minh layout của SVG/PNG/Word và chưa tạo video.

## 8. Các bước demo và kết luận bàn giao

Thực hiện [checklist demo 07/11](../deployment/demo-guide.md): chọn DB đã duyệt → dừng writer → backup/restore tạm → chạy API 8000/Admin 5174/guest 5173 → Admin CRUD/status → guest search/map/TTS → consent/stats → mobile LAN/GPS/TTS → logout/dừng. Khi tile lỗi về danh sách; thiếu giọng giữ văn bản; mất API hiện Thử lại; GPS không đủ accuracy dùng nghe thủ công và ghi chưa xác minh; revoke offline giữ pending. Không dùng mock thay bằng chứng API/thiết bị, không công bố seed placeholder.

Upload ảnh tiếp tục tạm gác. Không thay database cá nhân, `.env`, dependency/lockfile; không thêm database, node_modules, bundle, screenshot/log runtime hoặc secret vào diff. Không commit/push/merge/sửa bảng phân công. Các phần chờ thiết bị, dữ liệu duyệt và tài liệu/video đã được nêu rõ để nhóm quyết định nghiệm thu.

## 9. Danh sách file thay đổi và rà soát cuối

Danh sách chính xác theo Git được ghi dưới đây sau kiểm tra cuối; tất cả là code/test/hướng dẫn hoặc báo cáo, không phải dữ liệu vận hành.

<!-- handoff-manifest -->

Rà soát Git: **48 tệp, 38 sửa và 10 mới**, không xóa, không stage. HEAD/nhánh giữ nguyên.

| Tệp | Thay đổi | Lý do |
| --- | --- | --- |
| [README.md](../../README.md) | Sửa | Trạng thái tích hợp, UC12 mobile, dữ liệu nháp và liên kết bàn giao. |
| [RUNNING.md](../../RUNNING.md) | Sửa | Chọn DB rõ ràng, mock/API thật, UC12, lệnh NFR08 và demo. |
| [apps/admin-web/README.md](../../apps/admin-web/README.md) | Sửa | Công bố/ẩn và Dashboard đã tích hợp, ảnh tạm gác. |
| [apps/admin-web/src/features/admin/analytics/Dashboard.jsx](../../apps/admin-web/src/features/admin/analytics/Dashboard.jsx) | Sửa | Hủy request cũ, reset số liệu range, giờ Việt Nam. |
| [apps/admin-web/src/features/admin/auth/Admin.jsx](../../apps/admin-web/src/features/admin/auth/Admin.jsx) | Sửa | Ổn định callback hết phiên, tránh reset polling khi parent render. |
| [apps/admin-web/src/features/admin/places/Places.jsx](../../apps/admin-web/src/features/admin/places/Places.jsx) | Sửa | Nút công bố/ẩn VI/EN, xác nhận và mục còn thiếu. |
| [apps/admin-web/src/services/api.js](../../apps/admin-web/src/services/api.js) | Sửa | Giữ error.details và status để UI giải thích lỗi publish. |
| [apps/guest-web/src/components/TtsControls.jsx](../../apps/guest-web/src/components/TtsControls.jsx) | Sửa | Dừng TTS đồng bộ theo vòng đời component/bài. |
| [apps/guest-web/tests/acceptance.spec.js](../../apps/guest-web/tests/acceptance.spec.js) | Mới | 5 ca HTTP UC09/stats/responsive 375/768/1440, đợi dữ liệu render. |
| [apps/guest-web/tests/integration.spec.js](../../apps/guest-web/tests/integration.spec.js) | Sửa | Đồng bộ locale/route commit trước assertion cleanup và late voices. |
| [apps/mobile/README.md](../../apps/mobile/README.md) | Sửa | UC12, pending/storage/mock và giới hạn kiểm thử HTTP/native. |
| [apps/mobile/src/context/translations.js](../../apps/mobile/src/context/translations.js) | Sửa | Thông báo VI/EN cho lỗi lưu trữ thống kê. |
| [apps/mobile/src/features/location/autoPlayEngine.js](../../apps/mobile/src/features/location/autoPlayEngine.js) | Sửa | Bỏ tọa độ ngoài miền và accuracy âm. |
| [apps/mobile/src/features/privacy/AnalyticsClient.js](../../apps/mobile/src/features/privacy/AnalyticsClient.js) | Sửa | Bảo vệ pending, retry, race, storage, rollback grant và mock. |
| [apps/mobile/src/features/privacy/ConsentModal.js](../../apps/mobile/src/features/privacy/ConsentModal.js) | Sửa | Busy/storage/mock guards, giữ lỗi lựa chọn rõ ràng. |
| [apps/mobile/src/features/privacy/PrivacyContext.js](../../apps/mobile/src/features/privacy/PrivacyContext.js) | Sửa | Foreground/NetInfo fail closed và tắt analytics trong mock. |
| [apps/mobile/src/features/privacy/PrivacyScreen.js](../../apps/mobile/src/features/privacy/PrivacyScreen.js) | Sửa | Khóa grant khi pending/storage/mock, không báo lưu thành công khi thất bại. |
| [apps/mobile/src/services/analyticsApi.js](../../apps/mobile/src/services/analyticsApi.js) | Sửa | Mock không giả xác nhận HTTP; trả UNSUPPORTED khi gọi nhầm. |
| [apps/mobile/tests/location/autoPlayEngine.test.js](../../apps/mobile/tests/location/autoPlayEngine.test.js) | Sửa | Regression tọa độ và accuracy GPS không hợp lệ. |
| [apps/mobile/tests/privacy/AnalyticsClient.test.js](../../apps/mobile/tests/privacy/AnalyticsClient.test.js) | Sửa | Regression pending/retry/race/storage/rollback/chuyển mock. |
| [apps/mobile/tests/privacy/ConsentModal.test.js](../../apps/mobile/tests/privacy/ConsentModal.test.js) | Mới | Lỗi grant giữ modal và decline vẫn dùng được; chỉ báo mock. |
| [apps/mobile/tests/privacy/PrivacyContext.test.js](../../apps/mobile/tests/privacy/PrivacyContext.test.js) | Mới | Provider mock không xóa yêu cầu thật hoặc tạo/gửi tracking. |
| [apps/mobile/tests/privacy/PrivacyScreen.test.js](../../apps/mobile/tests/privacy/PrivacyScreen.test.js) | Mới | Kiểm UI pending/storage/mock và thông báo thao tác thất bại. |
| [apps/mobile/tests/services/analyticsApi.test.js](../../apps/mobile/tests/services/analyticsApi.test.js) | Sửa | Guard chạy foreground và mock không giả ACK. |
| [apps/mobile/tests/services/backend.integration.test.js](../../apps/mobile/tests/services/backend.integration.test.js) | Sửa | 2 ca analytics HTTP thật bên cạnh 2 ca public hiện có. |
| [backend/README.md](../../backend/README.md) | Sửa | Bỏ DB preview cá nhân mặc định, nhắc startup retention/backup. |
| [backend/app/api/routes/admin_pois.py](../../backend/app/api/routes/admin_pois.py) | Sửa | Publish kiểm tra dữ liệu legacy và giao dịch BEGIN IMMEDIATE. |
| [backend/app/api/routes/admin_stats.py](../../backend/app/api/routes/admin_stats.py) | Sửa | Chung mốc now cho kiểm range và tính thống kê. |
| [backend/scripts/backup_db.py](../../backend/scripts/backup_db.py) | Mới | Snapshot nguồn read-only vào tệp mới, kiểm integrity/FK. |
| [backend/scripts/start_demo.py](../../backend/scripts/start_demo.py) | Sửa | Bắt buộc DB rõ ràng, kiểm đường dẫn/port; không seed/migrate. |
| [backend/tests/test_backup_db.py](../../backend/tests/test_backup_db.py) | Mới | WAL/restore, không ghi đè và vi phạm khóa ngoại. |
| [backend/tests/test_day4.py](../../backend/tests/test_day4.py) | Sửa | Legacy publish, race và biên giờ VN/30 ngày/90 giây. |
| [backend/tests/test_start_demo.py](../../backend/tests/test_start_demo.py) | Mới | CLI không tạo DB, không dùng default cá nhân, đúng tham số. |
| [docs/API_CONTRACT.md](../../docs/API_CONTRACT.md) | Sửa | Đồng bộ mobile thật/mock, publish và Dashboard; giữ endpoint/schema. |
| [docs/analysis-design/api-analytics.md](../../docs/analysis-design/api-analytics.md) | Sửa | UC12 mobile hiện tại và bảo vệ pending qua mock. |
| [docs/analysis-design/api-design.md](../../docs/analysis-design/api-design.md) | Sửa | Trạng thái triển khai và đường dẫn API hiện tại. |
| [docs/analysis-design/architecture.md](../../docs/analysis-design/architecture.md) | Sửa | Kiến trúc hiện tại, dev/prod và chỗ sơ đồ cần nhóm xác minh. |
| [docs/analysis-design/data-dictionary.md](../../docs/analysis-design/data-dictionary.md) | Mới | Từ điển 7 bảng, CHECK/FK/index và khác biệt DDL/validator. |
| [docs/analysis-design/database-design.md](../../docs/analysis-design/database-design.md) | Sửa | Bỏ nhận định analytics/status chưa triển khai, liên kết từ điển. |
| [docs/analysis-design/use-cases.md](../../docs/analysis-design/use-cases.md) | Sửa | Trạng thái UC01–UC12 và giới hạn bằng chứng. |
| [docs/deployment/backup-restore.md](../../docs/deployment/backup-restore.md) | Sửa | Lệnh sao lưu/phục hồi vào tệp mới và điều kiện dừng writer. |
| [docs/deployment/demo-guide.md](../../docs/deployment/demo-guide.md) | Sửa | Checklist thao tác 07/11, LAN/GPS/TTS và phương án sự cố. |
| [docs/deployment/setup.md](../../docs/deployment/setup.md) | Sửa | Chọn DB và mô tả cài đặt/tích hợp đúng hiện trạng. |
| [docs/mobile/README.md](../../docs/mobile/README.md) | Sửa | Liên kết kiểm thử 06/11 và checklist demo mới. |
| [docs/mobile/testing/mobile-field-test.md](../../docs/mobile/testing/mobile-field-test.md) | Sửa | 22 ca thiết bị, UC12 đã nối; kết quả thật để trống. |
| [docs/testing/integration-2026-11-06.md](../../docs/testing/integration-2026-11-06.md) | Mới | Báo cáo hiện trạng, thay đổi, bằng chứng, nghiệm thu và WBS. |
| [docs/testing/test-results.md](../../docs/testing/test-results.md) | Sửa | Chỉ mục kết quả cuối và giới hạn, giữ lịch sử. |
| [docs/testing/tools/verify_handoff.py](../../docs/testing/tools/verify_handoff.py) | Mới | Tái lập init/seed/backup/restore và 20 HTTP NFR08 trên DB tạm. |

Dấu SHA256 của 29 tệp code/test thay đổi (sắp theo đường dẫn, băm path UTF-8 + NUL + bytes + NUL): `d08779e3b370e3fb0b7d2632aba01ae7ba4cfa1cfcd3a32203f1c393867a6c62`. Dấu này nhận diện phần code/test chưa commit, không thay commit Git.

Kiểm tra cuối: `git diff --check` không lỗi whitespace; chỉ cảnh báo LF/CRLF. Danh sách thay đổi không có `.env`, token/khóa thật theo các mẫu phổ biến đã rà, database/backup, node_modules hoặc output build/test. Các liên kết Markdown local của tệp thay đổi đều tồn tại. Không phát hiện conflict marker hoặc ký tự thay thế lỗi mã hóa. Không chạy migration lên database cá nhân. Không tự sửa bảng phân công, commit, push hoặc merge.
