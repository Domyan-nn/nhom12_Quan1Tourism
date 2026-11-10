# Phần mở rộng B – "Gần tôi" (feat/b-near-me)

## Yêu cầu

- Nút **Gần tôi** ở màn Khám phá, trên web khách và mobile.
- Khách cho phép vị trí: danh sách sắp theo khoảng cách tăng dần, mỗi địa điểm hiện khoảng cách ("~350 m", "1,2 km").
- Khách từ chối hoặc lỗi: giữ thứ tự cũ và báo lý do.
- **BR07:** chỉ tính trên máy khách bằng haversine. Không gửi tọa độ lên server; không lưu vào localStorage, cookie hay bộ nhớ máy.

## Thiết kế

| Quyết định | Lý do |
| --- | --- |
| Sắp xếp sau khi API trả danh sách, không thêm tham số tọa độ vào API | Giữ BR07; không đổi `API_CONTRACT` |
| Hàm thuần `sortByDistance`, `formatDistance` ở `features/nearMe/nearMe.js` (web) và `features/places/nearMe.js` (mobile), cùng hành vi và cùng bộ ca test | Kiểm thử không cần trình duyệt hay thiết bị; hai nền tảng không lệch nhau |
| Bằng khoảng cách giữ thứ tự cũ; địa điểm thiếu hoặc hỏng tọa độ xếp cuối và không hiện khoảng cách | Kết quả ổn định, không làm hỏng danh sách khi một bản ghi lỗi |
| Xin vị trí một lần, `enableHighAccuracy: false`, hết hạn 10 giây | Đủ để xếp thứ tự; tránh bật GPS tốn pin |
| Vị trí chỉ nằm trong state của trang; tắt "Gần tôi" hoặc rời trang thì bỏ | BR07 |
| Làm tròn: dưới 995 m làm tròn 10 m ("~350 m"); từ 995 m hiện km một chữ số thập phân; từ 10 km làm tròn số nguyên | Dễ đọc; số tiếng Việt dùng dấu phẩy |

Các lỗi và thông báo: từ chối quyền, không xác định được vị trí, hết thời gian, trình duyệt không hỗ trợ, trang không an toàn (định vị chỉ chạy trên HTTPS hoặc localhost). Cả năm trường hợp giữ thứ tự cũ.

## Tiến độ theo lịch

| Ngày | Việc | Trạng thái |
| --- | --- | --- |
| 10/11 | Hàm sắp xếp và test (web, mobile); nút Gần tôi trên web | Đã viết; test đơn vị đạt. Chưa chạy trên trình duyệt |
| 11/11 | Nút Gần tôi trên mobile (expo-location); Playwright cấp vị trí giả, kiểm thứ tự và không request nào chứa tọa độ; mở PR | Chưa làm |
| 12/11 | Thử trên điện thoại thật, quay video; sửa góp ý review | Chưa làm |

## Kiểm thử

- Web: `npm.cmd --prefix apps/guest-web test` (có `tests/nearMe.test.js`, 14 ca, gồm kiểm mã không gọi mạng/không lưu bộ nhớ trình duyệt).
- Mobile: `npm.cmd --prefix apps/mobile test -- --runInBand` (có `tests/places/nearMe.test.js`, 10 ca).

## Phiếu thử thực địa (ngày 12/11) – để trống đến khi thử thật

| # | Nền tảng | Bước | Mong đợi | Kết quả | Video |
| --- | --- | --- | --- | --- | --- |
| 1 | Web trên điện thoại | Bấm Gần tôi, cho phép vị trí | Danh sách sắp theo khoảng cách, có "~… m" | | |
| 2 | Web | Từ chối quyền vị trí | Báo lý do, giữ thứ tự cũ | | |
| 3 | Web | Bấm lại để tắt | Về thứ tự cũ, khoảng cách biến mất | | |
| 4 | Mobile | Bấm Gần tôi, cho phép vị trí | Như bước 1 | | |
| 5 | Mobile | Từ chối quyền vị trí | Như bước 2 | | |
| 6 | Cả hai | Xem Network/log khi bật Gần tôi | Không có request nào chứa tọa độ | | |
| 7 | Cả hai | Xem dòng ghi công ảnh của phần A | Hiện dưới ảnh ở trang chi tiết | | |
