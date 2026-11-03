# Ngày 2 (02/11/2026) – Lê Nam Thuận: UC01 và UC02 trên mobile

Mốc Gate 2 (phần mobile): khách tìm kiếm, lọc địa điểm và xem được ghim trên bản đồ. **Chưa kiểm thử điện thoại/emulator.** Tài liệu gốc của Thuận từ commit `0e2e16f` đã được chuyển về `docs/mobile/testing/`; code và test tương ứng nay nằm ở `apps/mobile/`.

## Việc trong bảng timeline và hiện trạng

| Việc ngày 2 | Hiện trạng trong repo | Chưa xác minh |
| --- | --- | --- |
| Màn hình danh sách và chi tiết địa điểm trên mobile (UC01) | `ExploreScreen`, `PoiDetailScreen`, gọi `/api/v1/pois` với `q`, `category_id` | Chạy trên Expo Go với dữ liệu đã công bố |
| Bản đồ hiển thị điểm đánh dấu công khai (UC02) | `MapScreen` dùng danh sách công khai; marker toạ độ hỏng bị loại (`mapMarkers.js`) | Bản đồ hiển thị trên Android/iOS thật |

## Kiểm thử tự động đã có cho ngày 2

- `tests/places/exploreFilter.test.js` – 6 ca: hoa/thường, khoảng trắng, dấu, NFC, lọc danh mục, rỗng.
- `tests/map/mapMarkers.test.js` – 6 ca: toạ độ hợp lệ/hỏng, ID hỏng/trùng, biên, danh sách rỗng.
- `tests/map/MapScreen.test.js` – 8 ca giả lập native map/GPS: Marker/fit cùng tập, rỗng/toàn sai, chậm/lỗi API, map timeout/thử lại, stale data/thử lại, 404 và phản hồi chọn ghim đến muộn.
- `tests/services/publicApi.test.js` – đã có: đường dẫn `/v1`, tham số `q`, `category_id`, phản hồi sai định dạng.
- `tests/services/backend.integration.test.js` – 2 ca HTTP thật opt-in, dùng fixture SQLite riêng. Đợt 03/11: tổng mobile 69/69 với API, mặc định 67 pass + 2 skip. Xem [báo cáo](../../testing/gate2-integration-2026-11-03.md); không dùng kết quả này để điền PASS cho thiết bị.

## Chuẩn bị thiết bị cho Thuận

1. Từ gốc repo, chạy fixture bằng Python của `.venv`: đặt `$env:SAIGON_TEST_HOST='0.0.0.0'`, rồi `.\.venv\Scripts\python.exe -u apps/guest-web/tests/serve_api.py`. Cổng 18082 phải trống; chỉ dùng mạng phát triển tin cậy. Fixture tự tạo DB tạm có palace/market published, draft/hidden và bài VI/EN/FR.
2. Mở `http://<IP-LAN>:18082/api/v1/health` từ điện thoại. Trong `.env` mobile đặt `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1`, `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:18082/api`. Không ghi đè cấu hình cá nhân nếu chưa lưu lại. Từ `apps/mobile/`, chạy `npx.cmd expo start --clear` và mở bằng Expo Go tương thích SDK 56 hoặc development build phù hợp.
3. Ghi mẫu máy, OS, Expo Go/build, thời gian, người thử, commit thực tế và chế độ API. Xác nhận phần native map đã cấu hình nhà cung cấp; Android build riêng có thể cần Google Maps key cục bộ, không đưa key vào Git.
4. Để mô phỏng POI vừa ẩn trên đúng DB tạm: từ máy tính chạy `Invoke-RestMethod -Method Put 'http://127.0.0.1:18082/__test/pois/palace/status?status=hidden'`. Khôi phục bằng `status=published`. Backend hiện chưa có thao tác công bố/ẩn UC09; route `__test` chỉ nằm trong fixture kiểm thử, không phải endpoint sản phẩm.
5. Ca tọa độ hỏng dùng fixture public API giả lập riêng trong development/test; không vô hiệu CHECK SQLite hoặc sửa schema để chèn dữ liệu sai. Tắt mạng/dừng fixture để thử lỗi; khởi động lại sẽ tạo DB tạm mới. Dừng server và Expo khi xong.

## Phiếu thử thủ công Gate 2

Điều kiện: backend chạy với `--host 0.0.0.0`, `EXPO_PUBLIC_USE_MOCK=false`, và **ít nhất vài địa điểm ở trạng thái `published`** (nếu không có, danh sách và bản đồ sẽ rỗng – đó là hành vi đúng của BR01).

| # | Bước | Mong đợi | Kết quả | Minh chứng |
| --- | --- | --- | --- | --- |
| 1 | Mở tab Khám phá | Chỉ có địa điểm công khai; không có bản nháp/hidden | Chưa kiểm thử | |
| 2 | Gõ một phần tên (có dấu, viết hoa/NFD) | Danh sách lọc đúng, không phân biệt hoa/thường | Chưa kiểm thử | |
| 3 | Chọn danh mục rồi kết hợp từ khóa | Đúng giao điều kiện; nhãn VI/EN theo dữ liệu | Chưa kiểm thử | |
| 4 | Từ khóa không tồn tại | Thông báo rỗng; đổi điều kiện được ngay | Chưa kiểm thử | |
| 5 | Chạm địa điểm, chọn bài FR, đổi UI VI/EN | Mở đúng chi tiết; bài FR không tự đổi | Chưa kiểm thử | |
| 6 | Mở tab Bản đồ | Marker công khai có tọa độ hợp lệ; fit đúng vùng | Chưa kiểm thử | |
| 7 | Chạm marker, bấm Xem chi tiết; chọn nhanh hai ghim | Hiện tóm tắt và mở đúng địa điểm mới nhất | Chưa kiểm thử | |
| 8 | Từ chối quyền vị trí rồi mở map | Vẫn xem được map/marker; không có chấm vị trí | Chưa kiểm thử | |
| 9 | Ẩn palace bằng fixture rồi chạm marker hoặc mở chi tiết | Báo không khả dụng, bỏ ghim; không mở nội dung cũ | Chưa kiểm thử | |
| 10 | Tắt mạng rồi tìm kiếm/tải lại map; bật lại và Thử lại | Báo lỗi, phân biệt dữ liệu trong phiên; khôi phục được | Chưa kiểm thử | |
| 11 | Mạng chậm, native map chưa ready quá 12 giây | Loading rồi báo lỗi; Thử lại và Mở danh sách dùng được | Chưa kiểm thử | |
| 12 | Fixture rỗng, toàn tọa độ sai, hoặc hợp lệ lẫn sai | Không crash; chỉ ghim hợp lệ hoặc thông báo rỗng + danh sách | Chưa kiểm thử | |

| Thiết bị / OS | Expo Go / build | Ngày giờ | Người thử | Commit | Minh chứng |
| --- | --- | --- | --- | --- | --- |
| Chưa có | Chưa kiểm thử | | Lê Nam Thuận (cần thực hiện) | Điền sau khi nhóm commit | |
