# Ngày 4 (04/11/2026) – Lê Nam Thuận: thử sớm GPS/TTS trên điện thoại thật

Việc theo timeline: thử sớm một ca GPS/TTS trên điện thoại thật và ghi lại lỗi. **Tệp này là phiếu ghi; mọi ô để trống đến khi thử thật. Không điền kết quả khi chưa thử.**

## Thiết bị và môi trường

| Mục | Giá trị |
| --- | --- |
| Điện thoại / hệ điều hành | |
| Expo Go hay bản build | |
| Backend (địa chỉ, dữ liệu đã công bố) | |
| Ngày giờ, người thử | |

## Ca thử sớm: tự phát khi đến gần địa điểm (UC04 + UC03)

1. Bật backend, công bố ít nhất một địa điểm có bài thuyết minh tiếng Việt; ghi lại tọa độ và bán kính của địa điểm đó.
2. Mở app, tab Tự phát, bật công tắc, cấp quyền vị trí.
3. Đi đến trong bán kính (hoặc dùng ứng dụng giả lập vị trí) và đứng yên.
4. Quan sát: sau ít nhất 5 giây trong vùng, app có phát thuyết minh không; nhật ký có ghi "Đã phát"?
5. Ở lại trong vùng: có phát lại không (không được phép).
6. Ra khỏi vùng rồi vào lại trong dưới 600 giây: có phát lại không (không được phép).
7. Đưa app xuống nền rồi mở lại: theo dõi có dừng và tiếp tục đúng không.

| Bước | Kết quả thực tế | Đạt? |
| --- | --- | --- |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |

## Ca thử UC12 trên máy thật

| Bước | Mong đợi | Kết quả thực tế | Đạt? |
| --- | --- | --- | --- |
| Mở app lần đầu | Hiện hộp đồng ý | | |
| Chọn Từ chối | Không có request nào tới `/analytics` | | |
| Chọn Đồng ý, để app mở | Heartbeat gửi mỗi 30 giây | | |
| Rút đồng ý | Ngừng gửi ngay; server nhận `revoke` | | |
| Rút khi tắt mạng, bật lại | Yêu cầu rút được gửi lại | | |

## Danh sách lỗi phát hiện

| ID | Mô tả | Cách tái hiện | Mức độ | Trạng thái |
| --- | --- | --- | --- | --- |
| | | | | |
