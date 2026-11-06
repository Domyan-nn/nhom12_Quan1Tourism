# Mobile – Saigon Stories Quận 1 (React Native / Expo)

Ứng dụng dùng Expo SDK 56, bản đồ, thuyết minh TTS và tự phát theo vị trí **chỉ khi ứng dụng hiển thị**. Không có theo dõi vị trí nền hoặc chế độ offline. Dữ liệu đã tải có thể được giữ trong bộ nhớ trong phiên hiện tại khi mạng lỗi.

Hướng dẫn chạy và kiểm thử: [RUNNING.md](../../RUNNING.md).

Code marker và test từ commit Thuận `0e2e16f` đã được tích hợp vào `apps/mobile/src/features/map/` và `apps/mobile/tests/`; bản trùng ở `mobile/apps/mobile/` được đối chiếu và dọn. Cùng tập ID/tọa độ hợp lệ dùng cho cả Marker và fitToCoordinates, không yêu cầu bán kính geofence để vẽ ghim. Dữ liệu rỗng/toàn tọa độ sai có thông báo và nút về danh sách. API lỗi khi tải lại có nút Thử lại; phản hồi chọn ghim cũ không ghi đè ghim mới.

`npm.cmd test -- --runInBand` chạy test giả lập; 4 ca HTTP được bỏ qua khi chưa chọn API test (2 public, 2 analytics). Cách chạy bằng FastAPI/SQLite dùng một lần ở [RUNNING](../../RUNNING.md#api-thật-và-dữ-liệu-test-riêng-cho-gate-2). Ca analytics kiểm tra dữ liệu đã lưu tại server; ca thử gửi lại mô phỏng một lỗi mạng rồi gửi HTTP thật. Kết quả tự động và bundle Android không thay cho nghiệm thu native trên thiết bị. Thuận thực hiện [checklist Gate 2](../../docs/mobile/testing/day2-gate2-mobile.md) và [phiếu thực địa](../../docs/mobile/testing/mobile-field-test.md).

## Dữ liệu và cấu hình API

Các biến trong `.env` được đọc khi khởi động Expo:

- `EXPO_PUBLIC_USE_MOCK=true` (mặc định): dữ liệu mẫu cục bộ, có thông báo ở Khám phá; không gọi API địa điểm thật.
- `EXPO_PUBLIC_USE_MOCK=false`: gọi backend thật, không tự chuyển sang mock khi lỗi.
- `EXPO_PUBLIC_API_BASE_URL`: URL kết thúc bằng `/api`, ví dụ `http://<IP-LAN-MAY-CHU>:8000/api`. Để trống sẽ thử dùng host Expo; Android emulator dùng `10.0.2.2` nếu không phát hiện host. Trên điện thoại thật, `localhost` là điện thoại, không phải máy tính.
- `EXPO_PUBLIC_API_STYLE=v1`: dùng API backend hiện tại `/api/v1/categories`, `/api/v1/pois`, `/api/v1/pois/{id}`. Giá trị `contract` là tương thích đường dẫn cũ, backend hiện tại không hỗ trợ.

## Ngôn ngữ, quyền và TTS

Tab Tự phát có hai lựa chọn độc lập: ngôn ngữ giao diện VI/EN và ngôn ngữ thuyết minh. Danh mục dùng tên tiếng Anh từ API nếu có, nếu thiếu thì giữ tên tiếng Việt. Tên địa điểm và nội dung thuyết minh hiển thị theo dữ liệu thực tế; thiếu bài ở ngôn ngữ đã chọn được thông báo, không tự dịch hoặc đổi bài.

Ứng dụng chỉ xin quyền vị trí khi người dùng yêu cầu, không xin quyền nền; từ chối quyền vẫn có thể xem địa điểm và nghe thủ công. TTS chỉ thử phát khi thiết bị liệt kê được giọng có mã ngôn ngữ phù hợp và có định danh; không xác nhận được giọng thì báo lỗi và vẫn cho đọc văn bản. Cần kiểm tra giọng, GPS và bản đồ trên điện thoại thật.

Logic địa lý hiện yêu cầu ở trong vùng 5 giây, và chỉ phát lại sau khi đã rời vùng rồi quay lại ít nhất 600 giây sau lần phát trước. Khoảng cách giữa hai mẫu GPS hợp lệ quá 15 giây làm tính lại khoảng xác nhận; mẫu không có độ chính xác bị bỏ. Đây là các giả định cần nhóm xác nhận và thử thực địa. Với Android build riêng, bản đồ có thể cần cấu hình khóa Google Maps; không đưa khóa vào Git.

UC12 đã nối với backend: `createAnalyticsApi` gọi `POST /api/v1/analytics/heartbeat` và `/revoke` (kiểu `contract` dùng `/api/analytics/**`) với `session_id` UUID v4. Lần mở đầu hiện hộp đồng ý; từ chối hoặc chưa chọn thì không tạo mã và không gọi API. Đồng ý thì gửi heartbeat 30 giây chỉ khi ứng dụng hiển thị và đã xác nhận có mạng. Rút đồng ý dừng gửi ngay, lưu mã chờ trước khi xóa mã đang dùng; lỗi thì thử lại khi online/foreground và mỗi 30 giây đến khi server trả 204. Không cho đồng ý lại khi yêu cầu rút chưa xong. Heartbeat không chồng request; 409 của mã cũ không thay đổi phiên mới. Lỗi bộ nhớ thiết bị dừng thống kê và hiện thông báo; yêu cầu rút chưa lưu có thể mất khi đóng ứng dụng. Chế độ mock không tạo mã hay gửi thống kê, khóa Đồng ý và có chỉ báo; Từ chối vẫn cho xem công khai. Yêu cầu rút còn chờ từ API thật được giữ nguyên khi chuyển mock, chỉ xóa sau xác nhận server khi trở lại API thật. Đã kiểm tra đơn vị và HTTP với FastAPI/SQLite tạm, **chưa thử với backend đang chạy trên điện thoại thật**.

Đợt 04/11 bổ sung chờ native Stop trước khi phát bài thay thế, xử lý lỗi pause/resume, timeout từng đoạn và lựa chọn từ bài thực có; không đổi UI VI/EN theo locale bài. Checklist và tình trạng chưa thử âm thanh/thiết bị ở [Gate 3](../../docs/mobile/testing/day3-gate3-tts.md), kết quả tự động tại [báo cáo tích hợp](../../docs/testing/integration-2026-11-04.md).
