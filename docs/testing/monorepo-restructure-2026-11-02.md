# Tái cấu trúc monorepo – 02/11/2026

## Điểm bắt đầu và phạm vi

- Nhánh: `main`; commit: `a3ebf91d0e30e88a9ea1f2c69bb2737dfeff35f9`.
- Git status trước sửa: sạch, đồng bộ với `origin/main` theo tracking ref cục bộ. Không fetch hoặc thay đổi lịch sử trong tác vụ này.
- Phạm vi: di chuyển ứng dụng, tài liệu mobile và cập nhật đường dẫn. Không thay đổi endpoint, biến môi trường, schema SQLite, dependency, giao diện hoặc quy tắc nghiệp vụ.
- Không commit/push/merge; không sửa bảng phân công.
- Môi trường thực thi: Windows/PowerShell, Python 3.12.15, Node.js 22.22.0, npm 10.9.4, Microsoft Edge cho Playwright. Python dùng `.venv` của repository; Node portable được bổ sung vào PATH của tiến trình kiểm tra.
- Không có `.github/` hoặc workflow CI trong repository trước chuyển.

## Cấu trúc và ánh xạ

Trước: Admin trong `web/`, guest trong `web/guest-web/`, mobile trong `mobile/mobile/`; `mobile/docs/` còn sơ đồ và checklist, còn `mobile/src`, `mobile/assets`, `mobile/tests` chỉ chứa các tệp khung `.gitkeep`.

Sau: ba ứng dụng trong `apps/`; tài liệu mobile trong `docs/mobile/`. Backend, storage, PRD và các thư mục tài liệu khác giữ vị trí.

| Cũ | Mới | Cách xử lý |
| --- | --- | --- |
| `web/guest-web/` | `apps/guest-web/` | Chuyển trước, gồm file ẩn, fixture và lockfile |
| Phần Admin còn lại trong `web/` | `apps/admin-web/` | Chuyển sau khi tách guest |
| `mobile/mobile/` | `apps/mobile/` | Chuyển toàn ứng dụng và cấu hình local |
| `mobile/docs/` | `docs/mobile/` | Giữ đủ nguồn .dot, ảnh PNG/SVG và checklist |
| `mobile/README.md` | `docs/mobile/README.md` | Cập nhật liên kết đến ứng dụng và checklist |
| `.gitkeep` dưới `mobile/src`, `mobile/assets`, `mobile/tests` | Cùng nhánh dưới `apps/mobile/` | Giữ lại đầy đủ, không ghi đè file đang có |

Mọi nguồn/đích di chuyển được kiểm tra nằm trong workspace và đích chưa tồn tại. Expo đang chạy đã được người dùng xác nhận dừng. Lần đổi tên thư mục web trong sandbox bị Windows từ chối; sau đó thao tác di chuyển với quyền phù hợp đã thành công. Thư mục cũ chỉ được gỡ khi đã xác nhận không còn tệp cần giữ.

## Tệp được cập nhật ngoài việc đổi vị trí

- `.gitignore`: đổi đường dẫn cache Admin và output Playwright sang apps; tiếp tục bỏ qua .env, node_modules, build, database và storage.
- `apps/guest-web/playwright.config.js`: xác định root từ vị trí tệp cấu hình, đặt cwd rõ cho backend fixture và Vite. Chạy được qua `npm --prefix apps/guest-web` từ gốc repo.
- README gốc, `CAU_TRUC_DU_AN.md`, `docs/deployment/setup.md`: đường dẫn, bảng ánh xạ, lệnh cài/chạy/test độc lập cho ba ứng dụng và hướng dẫn nhóm đồng bộ.
- README của cả ba ứng dụng và `docs/mobile/README.md`: cập nhật liên kết giữa ứng dụng, tài liệu và fixture.
- `docs/analysis-design/architecture.md`: vị trí ứng dụng trong monorepo.
- `docs/testing/retest-2026-11-02.md`, `integration-fixes-2026-11-02.md`: sửa đích liên kết; giữ tên đường dẫn/lệnh lịch sử và thêm chú thích phân biệt.
- Hai chú thích nguồn trong `apps/mobile/src/services/mockData.js`, `apps/mobile/src/features/privacy/privacyText.js`: đường dẫn đến nguồn guest web tương ứng.

Vite, Babel, Expo, Jest, proxy API và import nội bộ không cần thay đổi vì cả ba ứng dụng được chuyển cùng cấu trúc nội bộ. Fixture Python vẫn lấy root bằng `parents[3]`: độ sâu `apps/guest-web/tests/serve_api.py` bằng vị trí cũ.

## Kết quả trước và sau

| Kiểm tra | Trước di chuyển | Sau di chuyển |
| --- | --- | --- |
| Backend unittest | 31/31 đạt | 31/31 đạt |
| Admin build | Đạt, 28 module | Đạt, 28 module; cùng tên hash bundle |
| Admin test script | Chưa có trong package.json | Giữ nguyên; không thêm test script |
| Guest unit tests | 4/4 đạt | 4/4 đạt |
| Guest build | Đạt, 41 module | Đạt, 41 module; cùng tên hash bundle |
| Guest browser | 8 ca đều báo PASS | 8 ca đều báo PASS |
| Mobile Jest thông thường | 47 đạt, 1 API integration bỏ qua | Đã chạy với API tạm: 48/48 đạt |
| Cài đặt từ lockfile tại vị trí mới | Dependency đã có | npm ci offline thành công cả ba ứng dụng |
| Expo config | Không chạy lại trong mốc trước của tác vụ này | Hợp lệ |
| Expo export Android/iOS | Không chạy lại trong mốc trước của tác vụ này | Cả hai bundle xuất thành công |
| Backend startup + health | Kiểm tra API có sẵn trong bộ unittest | Server thật với DB tạm khởi động, health trả 200 |
| Admin trình duyệt + API tạm | Không chạy thêm trong mốc trước | Đăng nhập, thêm/xóa danh mục, đọc lại qua public API, đăng xuất đều đạt |
| Thiết bị mobile thật | Chưa kiểm tra | Chưa kiểm tra |

Các lệnh đã chạy (đổi cwd trước/sau theo bảng ánh xạ):

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests
npm.cmd run build -- --configLoader runner --outDir <THU-MUC-TAM-MOI>
npm.cmd test
npm.cmd run test:browser -- --output <THU-MUC-TAM-MOI>
npm.cmd test -- --runInBand
npm.cmd --prefix apps/admin-web ci --offline --no-audit --no-fund
npm.cmd --prefix apps/guest-web ci --offline --no-audit --no-fund
npm.cmd --prefix apps/mobile ci --offline --no-audit --no-fund
npm.cmd --prefix apps/guest-web run test:browser -- --output <THU-MUC-TAM-MOI>
npx.cmd expo config --type public --json
npx.cmd expo export --platform all --output-dir <THU-MUC-TAM-MOI>
```

- Build web dùng configLoader runner và output Temp để tránh vấn đề quyền cache/build đã biết trong môi trường này; không sửa Vite config để giải quyết vấn đề ngoài phạm vi.
- Playwright trước và sau đều báo PASS cho cả 8 ca, nhưng tiến trình teardown Windows không tự thoát; phiên được dừng sau khi toàn bộ ca đã báo kết quả. Không coi đây là lần chạy suite kết thúc tự nhiên với exit 0.
- Mobile integration dùng `SAIGON_TEST_API_URL=http://127.0.0.1:18083/api` và backend thật với DB TemporaryDirectory. Các kiểm thử tạo dữ liệu published và tài khoản chỉ trong DB tạm.
- Admin smoke chạy Vite từ vị trí mới tại cổng 18175, proxy test về API tạm 18083. Không thay cấu hình proxy dev của ứng dụng.
- Export mobile chỉ kiểm tra khả năng tạo bundle, không phải native build hoặc chạy trên thiết bị.

## Đối chiếu bảo toàn và an toàn Git

Đã lập fingerprint trước di chuyển và đối chiếu sau:

- Toàn bộ 188 tệp Git ban đầu đều còn tại đường dẫn ánh xạ.
- Sáu tệp package.json/lockfile của ba ứng dụng giống byte-for-byte trước và sau npm ci.
- Hai database cục bộ tại backend/data giữ nguyên hash; không chạy migration hoặc ghi vào chúng.
- `.env` mobile được giữ tại apps/mobile với nội dung không đổi; không hiển thị nội dung trong báo cáo.
- Kiểm tra liên kết Markdown, đường dẫn cũ, Git diff/status và danh sách tệp Git có thể thêm. Các tham chiếu cũ còn lại thuộc bảng ánh xạ hoặc báo cáo lịch sử.
- Các tệp .env thật, database, node_modules, output build, cache Expo và storage vẫn bị Git bỏ qua. Không thêm token/mật khẩu thực hoặc dữ liệu cá nhân vào tài liệu.

Git chưa được stage, nên status có thể hiển thị xóa ở đường dẫn cũ và thư mục mới chưa tracked. Đây là kết quả của di chuyển chưa commit; đối chiếu tệp được thực hiện độc lập với hiển thị rename của Git.

## Giới hạn và vấn đề có trước

- Chưa kiểm tra trên điện thoại hoặc emulator; GPS, quyền, TTS, bản đồ và kết nối LAN cần checklist thực địa.
- Bộ test Admin độc lập chưa có; lần này thực hiện smoke test trình duyệt bổ sung trên DB tạm.
- npm ci hiển thị cảnh báo deprecated của dependency gián tiếp; không nâng cấp dependency trong tác vụ di chuyển.
- Các báo cáo cũ có thể mô tả lỗi hoặc chức năng chưa hoàn thành ở commit cũ; giữ bằng chứng lịch sử, không diễn giải như lỗi do tái cấu trúc.
- Những giới hạn đã biết về analytics, bản đồ/TTS web và schema database chính chưa nâng cấp không được mở rộng sửa trong tác vụ này.

## Nhóm tiếp tục làm việc

Sau khi nhóm review và merge, An/Thuận cần lưu thay đổi cá nhân, đồng bộ nhánh theo quy trình nhóm và mở lại terminal ở apps tương ứng. Chạy npm ci trong từng ứng dụng; giữ .env cá nhân ở thư mục ứng dụng mới, không ghi đè cấu hình đã có. Backend vẫn chạy từ gốc theo hướng dẫn hiện hành.

Xem [setup Windows](../deployment/setup.md), [Admin](../../apps/admin-web/README.md), [guest](../../apps/guest-web/README.md), [mobile](../../apps/mobile/README.md) và [checklist thiết bị](../mobile/testing/mobile-field-test.md).
