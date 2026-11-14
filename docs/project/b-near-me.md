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

Trên mobile, vị trí xin bằng `expo-location` ở chế độ foreground, độ chính xác vừa phải, hết hạn sau 10 giây. Hỏi quyền bị từ chối, dịch vụ vị trí đang tắt hoặc không đọc được tọa độ, và hết thời gian là ba thông báo riêng; cả ba giữ thứ tự cũ. Logic xin vị trí nằm ở `features/places/nearMePosition.js` (nhận module `expo-location` qua tham số nên kiểm thử được), hook ở `useNearMe.js`.

Các lỗi và thông báo: từ chối quyền, không xác định được vị trí, hết thời gian, trình duyệt không hỗ trợ, trang không an toàn (định vị chỉ chạy trên HTTPS hoặc localhost). Cả năm trường hợp giữ thứ tự cũ.

## Tiến độ theo lịch

| Ngày | Việc | Trạng thái |
| --- | --- | --- |
| 10/11 | Hàm sắp xếp và test (web, mobile); nút Gần tôi trên web | Đã merge (PR #4) |
| 11/11 | Nút Gần tôi trên mobile (expo-location); Playwright cấp vị trí giả, kiểm thứ tự và không request nào chứa tọa độ; mở PR | Đã viết mã và test. Chờ chạy Jest, Playwright trên máy và CI trước khi ghi "đạt" |
| 12/11 | Thử trên điện thoại thật, quay video; sửa góp ý review | Chưa làm |

## Kiểm thử

- Web, đơn vị: `npm.cmd --prefix apps/guest-web test` (có `tests/nearMe.test.js`, 14 ca, gồm kiểm mã không gọi mạng/không lưu bộ nhớ trình duyệt).
- Web, Playwright (Edge, cần `.venv` ở gốc repo đã cài `backend/requirements-dev.txt`): `npm.cmd --prefix apps/guest-web run test:browser -- tests/nearMe.spec.js --reporter=line` (có `tests/nearMe.spec.js`, 5 ca: sắp thứ tự và khoảng cách với vị trí giả, không request nào chứa tọa độ, không ghi localStorage/sessionStorage/cookie, tắt Gần tôi, kết hợp tìm kiếm, tiếng Anh, từ chối quyền).
- Mobile: `npm.cmd --prefix apps/mobile test -- --runInBand`:
  - `tests/places/nearMe.test.js`, 10 ca: hàm sắp xếp, định dạng khoảng cách;
  - `tests/places/nearMePosition.test.js`, 10 ca: xin vị trí (từ chối, dịch vụ tắt, lỗi, hết hạn, tọa độ hỏng, dọn bộ đếm giờ) và quét mã BR07;
  - `tests/places/ExploreScreen.nearMe.test.js`, 6 ca: màn Khám phá sắp thứ tự, tắt, từ chối, dịch vụ tắt, địa điểm hỏng tọa độ, tọa độ không đi vào lời gọi API.

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
