# Phiếu kiểm thử thực địa – Mobile (NFR07)

Người thực hiện: Lê Nam Thuận. **Chưa thực hiện** – điền bảng khi thử trên thiết bị thật; không suy ra kết quả từ test đơn vị.

| Thiết bị / OS | Expo Go / bản build | Ngày | Người thử |
| --- | --- | --- | --- |
| | | | |

| # | UC | Bước thử | Kết quả mong đợi | Kết quả thực tế | Đạt? | Minh chứng |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | UC01 | Mở Khám phá, tìm "đức", lọc danh mục | Hiện đúng địa điểm; tìm có dấu/không phân biệt hoa thường | | | |
| 2 | UC01-E1 | Tìm từ khóa không tồn tại | Thông báo không có kết quả | | | |
| 3 | UC01-E2 | Tắt mạng rồi tìm | Báo lỗi, vẫn xem dữ liệu đã tải, Thử lại hoạt động | | | |
| 4 | UC02 | Mở Bản đồ, chạm marker, Xem chi tiết | Hiện tóm tắt rồi mở chi tiết | | | |
| 5 | UC02-A1 | Từ chối quyền vị trí | Vẫn xem bản đồ, không có chấm vị trí | | | |
| 6 | UC02-E2 | Admin ẩn một điểm rồi chạm marker | Báo không khả dụng | | | |
| 7 | UC03 | Chọn en/vi, bấm Nghe | Đọc đúng giọng ngôn ngữ | | | |
| 8 | UC03-A1 | Chọn ngôn ngữ chưa có bài | Báo thiếu, không đổi ngôn ngữ | | | |
| 9 | UC03-E1 | Máy chưa cài giọng vi | Báo lỗi, vẫn đọc được văn bản | | | |
| 10 | UC03-E2 | Android: bấm khi đang đọc | Không có Tạm dừng; có Dừng/Nghe lại | | | |
| 11 | UC04 | Bật Tự phát, đứng/đi vào vùng một địa điểm | Phát sau ≥ 5 giây trong vùng | | | |
| 12 | UC04-E1 | Từ chối quyền vị trí | Báo lỗi, công tắc tắt | | | |
| 13 | UC04 / BR08 | Ở lại trong vùng sau khi phát | Không phát lại | | | |
| 14 | UC04 / BR08 | Ra khỏi vùng, vào lại < 600 giây | Không phát lại | | | |
| 15 | UC04 / BR08 | Ra khỏi vùng, vào lại ≥ 600 giây | Phát lại | | | |
| 16 | UC04 / BR07 | Đưa ứng dụng xuống nền | Dừng theo dõi; mở lại thì tiếp tục | | | |
| 17 | UC12 | Lần mở đầu | Hiện hộp đồng ý; Từ chối thì không gọi API thống kê | | | |
| 18 | UC12-A2 | Rút đồng ý | Dừng gửi ngay; Admin không còn đếm phiên sau 90 giây | | | |
| 19 | UC12-E1 | Rút đồng ý khi tắt mạng, bật lại | Yêu cầu rút được gửi lại và thành công | | | |
