# Kế hoạch kiểm thử — Saigon Stories Quận 1

Phiên bản 09/11/2026, áp dụng cho nhánh `main` từ commit `c0c01ad`. Nguồn yêu cầu: PRD (F01–F12, BR01–BR19, NFR01–NFR08). Danh sách ca ở [test-cases.md](test-cases.md), ma trận truy vết ở [traceability-matrix.md](traceability-matrix.md), kết quả theo đợt ở [test-results.md](test-results.md).

## 1. Mục tiêu

- Xác nhận mỗi chức năng bắt buộc F01–F12 đạt tiêu chí chấp nhận trong PRD mục VI.
- Xác nhận các quy tắc nghiệp vụ BR01–BR19, đặc biệt các quy tắc có ngưỡng thời gian/khoảng cách (BR08, BR14–BR17).
- Xác nhận các yêu cầu phi chức năng NFR01–NFR08 ở mức đồ án đề ra.
- Có minh chứng cho phần không tự động hóa được: GPS, giọng TTS và thống kê trên điện thoại thật.

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Backend FastAPI và SQLite: API khách, API Admin, thống kê, migration, sao lưu | Các chức năng PRD mục 5.1 xếp ngoài phạm vi: tài khoản khách, AI, offline, GPS/audio nền, thanh toán, xuất báo cáo, phát hành cửa hàng ứng dụng |
| Guest web (React), Admin web (React) trên Edge/Chrome máy tính và khung 375–1440 px | Kiểm thử tải đồng thời, bảo mật xâm nhập, triển khai HTTPS công khai |
| Mobile Expo (Android/iOS qua Expo Go): danh sách, bản đồ, TTS, tự phát GPS foreground, đồng ý thống kê | Chất lượng dịch vụ bên ngoài: tile OpenStreetMap, ảnh Wikimedia, giọng đọc của hệ điều hành |

## 3. Chiến lược và mức kiểm thử

| Mức | Công cụ | Vị trí | Dữ liệu | Chạy khi |
| --- | --- | --- | --- | --- |
| Đơn vị backend | `unittest`/`pytest` | `backend/tests/` (service thống kê, migration, script) | SQLite tạm | Mỗi thay đổi backend |
| Tích hợp API | FastAPI `TestClient` | `backend/tests/test_admin_*.py`, `test_public_api.py`, `test_day4.py`, `test_analytics_integration.py` | SQLite tạm từ `init_db.py` + `seed_db.py` | Mỗi thay đổi backend |
| Đơn vị web | Node test runner, Vitest | `apps/guest-web/tests/*.test.js`, `src/features/privacy/analyticsClient.test.js` | Fetch/speech giả lập | Mỗi thay đổi guest web |
| Đơn vị và màn hình mobile | Jest (`jest-expo`) | `apps/mobile/tests/` | Engine/player/API giả lập | Mỗi thay đổi mobile |
| Hệ thống (E2E) web | Playwright + Microsoft Edge | `apps/guest-web/tests/*.spec.js` | `serve_api.py`: FastAPI thật trên SQLite tạm, 4 POI (2 công khai, 1 nháp, 1 ẩn) × vi/en/fr | Trước khi merge vào `main` |
| HTTP thật cho mobile (tùy chọn) | Jest + fixture | `apps/mobile/tests/services/backend.integration.test.js` | `serve_api.py` qua `SAIGON_TEST_API_URL` | Khi đổi API khách/thống kê |
| Thủ công trên thiết bị | Phiếu kiểm thử | [mobile-field-test.md](../mobile/testing/mobile-field-test.md) | DB demo hoặc fixture trên LAN | Trước demo và nghiệm thu |
| Hiệu năng NFR08 | Script | [`tools/verify_handoff.py`](tools/verify_handoff.py) | SQLite tạm, 20 request liên tiếp | Trước nghiệm thu |
| Chấp nhận | Kịch bản demo | [demo-guide.md](../deployment/demo-guide.md) | DB chính đã sao lưu | Buổi demo |

Kỹ thuật thiết kế ca: phân vùng tương đương và giá trị biên cho dữ liệu nhập (tọa độ ±90/±180, bán kính 20/1000, khoảng ngày 30 ngày, ngưỡng 30 phút/90 giây/600 giây), bảng quyết định cho điều kiện công bố và tự phát, kiểm thử chuyển trạng thái cho Nháp → Công khai → Ẩn, và kiểm thử theo luồng thay thế/ngoại lệ (A/E) của từng use case.

Nguyên tắc: test không ghi vào DB chính `backend/data/saigon_stories.db`; mọi bộ tự động dùng SQLite tạm tự hủy. Lỗi dịch vụ ngoài (tile, giọng) được giả lập để kiểm tra đường lùi, còn thành công thật chỉ ghi nhận bằng thử thủ công.

## 4. Môi trường

| Thành phần | Phiên bản đã dùng |
| --- | --- |
| Hệ điều hành máy phát triển | Windows 11 |
| Python / FastAPI / Uvicorn | 3.12 / 0.115.12 / 0.34.2 |
| Node / Vite | 22 / 7.3.7 (Admin), 8.3.5 (Guest) |
| Trình duyệt E2E | Microsoft Edge headless (Playwright 1.64.1) |
| Mobile | Expo SDK 58, React Native 0.88.1, Expo Go trên điện thoại cùng mạng LAN |

## 5. Tiêu chí bắt đầu và kết thúc

Bắt đầu một đợt kiểm thử khi: dependency đã cài theo [RUNNING.md](../../RUNNING.md), hai web build được, API khởi động được trên DB đích.

Kết thúc (đạt) khi:

1. Mọi bộ tự động ở mục 3 kết thúc với exit 0 (ca bỏ qua phải có lý do ghi trong kết quả).
2. Mỗi F01–F12 có ít nhất một ca đạt trong [ma trận truy vết](traceability-matrix.md).
3. Các ca thiết bị của F03, F04, F12 đã chạy và có minh chứng (ảnh/video/log đã loại thông tin nhạy cảm) trong `docs/testing/evidence/`.
4. Không còn lỗi mức Nghiêm trọng hoặc Cao đang mở.

## 6. Quản lý lỗi

| Mức | Định nghĩa | Xử lý |
| --- | --- | --- |
| Nghiêm trọng | Lộ dữ liệu nháp/ẩn cho khách, mất dữ liệu, bỏ qua kiểm tra quyền Admin, gửi thống kê khi chưa đồng ý | Sửa trước mọi việc khác; chặn merge |
| Cao | Một F không dùng được hoặc sai quy tắc BR | Sửa trước demo |
| Trung bình | Sai luồng ngoại lệ, thông báo sai, lỗi hiển thị trên một khung màn hình | Lên kế hoạch sửa |
| Thấp | Chính tả, giao diện nhỏ | Sửa khi có thời gian |

Mỗi lỗi ghi: mã ca liên quan, commit, môi trường, bước tái hiện, kết quả mong đợi/thực tế, minh chứng. Đề xuất dùng GitHub Issues của repo; kết quả theo đợt ghi vào [test-results.md](test-results.md).

## 7. Lệnh chạy

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/mobile test -- --runInBand
$env:SAIGON_TEST_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm.cmd --prefix apps/guest-web run test:browser
```

Chi tiết cổng, biến môi trường và cách xử lý lỗi quyền ghi ở [RUNNING.md](../../RUNNING.md).

## 8. Rủi ro kiểm thử

| Rủi ro | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- |
| Tile bản đồ, ảnh, giọng đọc phụ thuộc mạng và thiết bị | Kết quả thủ công dao động | E2E thay tile bằng fixture; ca thủ công ghi rõ thiết bị, giọng, mạng |
| Playwright cấu hình cho Windows + Edge | Máy khác khó chạy lại | Ghi môi trường; khi thêm CI cần cấu hình Chromium/Linux |
| Chưa có CI | Commit có thể làm hỏng test mà không ai biết (đã xảy ra ngày 08/11) | Merge qua PR, chạy đủ mục 7 trước khi merge |
| GPS khó tái hiện | Ca biên BR08 khó thử bằng tay | Kiểm bằng engine thuần trong Jest; ca thiết bị chỉ xác nhận luồng chính |
