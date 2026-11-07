# Phiếu kiểm thử thực địa – Mobile (NFR07)

Phụ trách theo kế hoạch: Lê Nam Thuận. **Đã có kết quả kiểm thử mobile do người dùng báo ngày 07/11/2026**; thông tin người trực tiếp thử, thiết bị/OS và minh chứng chưa được cung cấp.

## Kết quả cập nhật ngày 07/11/2026

Sau lượt thử được báo bên dưới, hệ thống đã [chuyển sang DB chính](../../deployment/database-consolidation-2026-11-07.md) và cấu hình mobile dùng API thật (`EXPO_PUBLIC_USE_MOCK=false`). Luồng đồng ý/rút thống kê trên điện thoại đang chờ thử lại với cấu hình mới; kết quả mock dưới đây được giữ làm lịch sử.

Nguồn: phản hồi của người dùng trong phiên làm việc sau khi nâng mobile lên Expo SDK 58. Working tree chưa commit; chưa có xác nhận phiên bản build trên thiết bị. Lượt thử được người dùng xác nhận đang dùng **dữ liệu giả lập (mock)**.

| Hạng mục | Kết quả người dùng báo | Phạm vi xác nhận |
| --- | --- | --- |
| Bản đồ mobile | Đạt | Bản đồ hoạt động ổn trong lượt thử; chưa có kết quả riêng cho từng ca lỗi bên dưới. |
| Quyền vị trí | Đạt | Người dùng xác nhận quyền vị trí hoạt động ổn; chưa mô tả riêng từng nhánh cấp/từ chối. |
| GPS | Đạt | Người dùng xác nhận GPS hoạt động ổn; chưa xác nhận các biên geofence, cooldown và vòng đời nền/foreground. |
| TTS tiếng Việt | Đạt | Người dùng xác nhận đọc tiếng Việt ổn. |
| TTS tiếng Anh | Đạt | Người dùng xác nhận đọc tiếng Anh ổn. |
| UC12 — đồng ý/rút đồng ý thống kê | Chưa kiểm thử được với API thật | Đang ở chế độ mock, nút Đồng ý bị khóa nên chưa thực hiện được luồng đồng ý/rút đồng ý. Đây là hành vi dự kiến của chế độ mock, chưa phải lỗi UC12. |

Để kiểm thử tiếp UC12: khởi động lại Expo với `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_STYLE=v1` và `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-BACKEND>:8000/api`, kết nối điện thoại cùng LAN với backend lắng nghe `0.0.0.0`. Xác nhận chỉ báo mock không còn rồi thử đồng ý, heartbeat và rút đồng ý; đối chiếu phản hồi API/Dashboard trước khi ghi đạt. Xem [hướng dẫn chạy](../../../RUNNING.md) và các ca 17–21 bên dưới.

Chưa có model/OS, phiên bản Expo Go/build, tên/mã giọng, ảnh/video/log hoặc kết quả từng bước chi tiết. Các ô chi tiết còn trống không phủ nhận kết quả tổng quát ở trên và chưa được tự động đánh dấu đạt.

## Checklist chi tiết còn cần xác nhận

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
| 7 | UC03 | Chọn en/vi, bấm Nghe | Đọc đúng giọng ngôn ngữ | Người dùng xác nhận TTS VI/EN hoạt động ổn, 07/11/2026 | Đạt theo phản hồi | Phản hồi người dùng; chưa có ảnh/video |
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
| 18 | UC12-A2 | Rút đồng ý | Dừng gửi ngay; sau khi server nhận revoke, phiên bị loại ngay (UI Dashboard cập nhật trong kỳ làm mới tối đa 30 giây) | Chưa thử được: chế độ mock khóa Đồng ý nên chưa tạo được phiên thống kê để rút | Chưa kiểm thử | Phản hồi người dùng, 07/11/2026 |
| 19 | UC12-E1 | Rút đồng ý khi tắt mạng, bật lại | Yêu cầu rút được gửi lại và thành công | | | |
| 20 | UC12-E1 | Khi rút đang chờ, thử đồng ý lại | Nút đồng ý bị khóa; không mất mã cần rút, không tạo phiên mới | | | |
| 21 | UC12 / BR15 | Đồng ý rồi đưa app xuống nền/mất mạng | Không gửi heartbeat khi nền/mất mạng; mở lại/online mới gửi | | | |
| 22 | UC04 / BR08 | Hai điểm chồng vùng, lỗi mẫu GPS/cùng khoảng cách | Lọc ứng viên trước, chọn gần nhất/tie ID; bỏ mẫu quá 15s, tương lai >1s, thiếu/sai độ chính xác | | | |
