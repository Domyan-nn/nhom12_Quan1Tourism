# Phiếu kiểm thử thực địa – Mobile (NFR07)

Người thực hiện: Lê Nam Thuận. **Chưa thực hiện** – điền bảng khi thử trên thiết bị thật; không suy ra kết quả từ test đơn vị.

## Checklist tối thiểu – chưa kiểm thử trên điện thoại

- [ ] Cấp và từ chối quyền vị trí; bản đồ và nghe thủ công vẫn dùng được khi từ chối.
- [ ] Bật/tắt tự phát, chuyển ứng dụng xuống nền khi đang xin quyền hoặc khởi tạo watcher, rồi mở lại.
- [ ] Kiểm tra mạng chậm, API lỗi, danh sách rỗng và bản đồ sẵn sàng chậm; thử lại khi có lỗi.
- [ ] Đổi giao diện VI/EN độc lập với ngôn ngữ thuyết minh; thử địa điểm chưa có bài phù hợp.
- [ ] Kiểm tra TTS khi có, không có và không liệt kê được giọng đúng ngôn ngữ.
- [ ] Kết nối điện thoại và backend thật trên cùng mạng, dùng địa chỉ LAN và `EXPO_PUBLIC_USE_MOCK=false`.

Các ca analytics dưới đây **đã có code kết nối API**, vẫn **chưa kiểm thử trên điện thoại**. Chọn API thật (`EXPO_PUBLIC_USE_MOCK=false`, style `v1`, base URL LAN kết thúc `/api`) và database thử nghiệm riêng. Không dùng chế độ mock để xác nhận thu hồi phía server. Không đưa session ID/token vào ảnh hoặc video công khai.

| Thiết bị / OS | Expo Go / bản build | Ngày | Người thử |
| --- | --- | --- | --- |
| | | | |

Commit/working tree: __________. Backend/database tạm và bộ dữ liệu: __________. Tên giọng và locale đã thử: __________. Video/ảnh/log đã loại thông tin nhạy cảm: __________.

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
| 18 | UC12-A2 | Rút đồng ý | Dừng gửi ngay; sau khi server nhận revoke, phiên bị loại ngay (UI Dashboard cập nhật trong kỳ làm mới tối đa 30 giây) | | | |
| 19 | UC12-E1 | Rút đồng ý khi tắt mạng, bật lại | Yêu cầu rút được gửi lại và thành công | | | |
| 20 | UC12-E1 | Khi rút đang chờ, thử đồng ý lại | Nút đồng ý bị khóa; không mất mã cần rút, không tạo phiên mới | | | |
| 21 | UC12 / BR15 | Đồng ý rồi đưa app xuống nền/mất mạng | Không gửi heartbeat khi nền/mất mạng; mở lại/online mới gửi | | | |
| 22 | UC04 / BR08 | Hai điểm chồng vùng, lỗi mẫu GPS/cùng khoảng cách | Lọc ứng viên trước, chọn gần nhất/tie ID; bỏ mẫu quá 15s, tương lai >1s, thiếu/sai độ chính xác | | | |
