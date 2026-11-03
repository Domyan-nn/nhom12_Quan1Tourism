# Ngày 2 (02/11/2026) – Lê Nam Thuận: UC01 và UC02 trên mobile

Mốc Gate 2 (phần mobile): khách tìm kiếm, lọc địa điểm và xem được ghim trên bản đồ. **Các ô "Kết quả" để trống đến khi thử trên thiết bị thật.**

## Việc trong bảng timeline và hiện trạng

| Việc ngày 2 | Hiện trạng trong repo | Chưa xác minh |
| --- | --- | --- |
| Màn hình danh sách và chi tiết địa điểm trên mobile (UC01) | `ExploreScreen`, `PoiDetailScreen`, gọi `/api/v1/pois` với `q`, `category_id` | Chạy trên Expo Go với dữ liệu đã công bố |
| Bản đồ hiển thị điểm đánh dấu công khai (UC02) | `MapScreen` dùng danh sách công khai; marker toạ độ hỏng bị loại (`mapMarkers.js`) | Bản đồ hiển thị trên Android/iOS thật |

## Kiểm thử tự động đã có cho ngày 2

- `tests/places/exploreFilter.test.js` – 6 ca: hoa/thường, khoảng trắng, dấu, NFC, lọc danh mục, rỗng.
- `tests/map/mapMarkers.test.js` – 4 ca: toạ độ hợp lệ/hỏng, danh sách rỗng.
- `tests/services/publicApi.test.js` – đã có: đường dẫn `/v1`, tham số `q`, `category_id`, phản hồi sai định dạng.

## Phiếu thử thủ công Gate 2

Điều kiện: backend chạy với `--host 0.0.0.0`, `EXPO_PUBLIC_USE_MOCK=false`, và **ít nhất vài địa điểm ở trạng thái `published`** (nếu không có, danh sách và bản đồ sẽ rỗng – đó là hành vi đúng của BR01).

| # | Bước | Mong đợi | Kết quả | Minh chứng |
| --- | --- | --- | --- | --- |
| 1 | Mở tab Khám phá | Chỉ có địa điểm công khai; không có bản nháp | | |
| 2 | Gõ một phần tên (có dấu, viết hoa) | Danh sách lọc đúng, không phân biệt hoa/thường | | |
| 3 | Chọn một danh mục | Chỉ còn địa điểm thuộc danh mục | | |
| 4 | Từ khóa không tồn tại | Thông báo không có kết quả; đổi điều kiện được ngay | | |
| 5 | Chạm vào một địa điểm | Mở chi tiết: tên, địa chỉ, ảnh nếu có, thuyết minh | | |
| 6 | Mở tab Bản đồ | Có marker cho từng địa điểm công khai | | |
| 7 | Chạm marker, bấm Xem chi tiết | Hiện tóm tắt rồi mở đúng địa điểm | | |
| 8 | Từ chối quyền vị trí | Vẫn xem được bản đồ và marker | | |
| 9 | Ẩn một địa điểm ở Admin rồi chạm marker | Báo địa điểm không còn khả dụng | | |
| 10 | Tắt mạng rồi tìm kiếm | Báo lỗi nhưng vẫn xem dữ liệu đã tải | | |
