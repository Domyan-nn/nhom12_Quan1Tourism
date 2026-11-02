# Mobile – Saigon Stories Quận 1 (React Native / Expo)

Ứng dụng dùng Expo SDK 56, bản đồ, thuyết minh TTS và tự phát theo vị trí **chỉ khi ứng dụng hiển thị**. Không có theo dõi vị trí nền hoặc chế độ offline. Dữ liệu đã tải có thể được giữ trong bộ nhớ trong phiên hiện tại khi mạng lỗi.

## Cài đặt và chạy

Cần Node.js tương thích SDK 56 (Node 22.12+), npm và Expo Go hỗ trợ SDK 56 hoặc môi trường Android/iOS tương ứng. Từ thư mục gốc repo:

```powershell
cd apps/mobile
npm.cmd ci
Copy-Item .env.example .env
npx.cmd expo start
```

Không ghi đè `.env` đang có. Dependency được khóa trong `package-lock.json`; `npm ci` dùng lockfile. SDK vẫn là 56, nhưng Expo và react-native-screens đã được cập nhật trong cùng SDK theo `expo install --check`, và bổ sung `babel-preset-expo` vốn thiếu. Nếu cập nhật dependency sau này, kiểm tra bằng `npx.cmd expo install --check` và cập nhật lockfile. Thay đổi native cần kiểm tra lại với Expo Go/build thực tế.

## Dữ liệu và cấu hình API

Chỉnh `.env`, rồi khởi động lại Expo:

- `EXPO_PUBLIC_USE_MOCK=true` (mặc định): dữ liệu mẫu cục bộ, có thông báo ở Khám phá; không gọi API địa điểm thật.
- `EXPO_PUBLIC_USE_MOCK=false`: gọi backend thật, không tự chuyển sang mock khi lỗi.
- `EXPO_PUBLIC_API_BASE_URL`: URL kết thúc bằng `/api`, ví dụ `http://<IP-LAN-MAY-CHU>:8000/api`. Để trống sẽ thử dùng host Expo; Android emulator dùng `10.0.2.2` nếu không phát hiện host. Trên điện thoại thật, `localhost` là điện thoại, không phải máy tính.
- `EXPO_PUBLIC_API_STYLE=v1`: dùng API backend hiện tại `/api/v1/categories`, `/api/v1/pois`, `/api/v1/pois/{id}`. Giá trị `contract` là tương thích đường dẫn cũ, backend hiện tại không hỗ trợ.

Điện thoại và máy chủ cần trên cùng mạng và firewall phải cho phép cổng 8000. Chạy backend từ gốc repo với database demo đã nâng cấp, ví dụ (chỉ dùng trên mạng phát triển tin cậy):

```powershell
$env:SAIGON_DATABASE = (Resolve-Path 'backend/data/preview-thu-nghiem-5826e873.db').Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Database cục bộ không nằm trong Git; nếu chưa có preview, xem hướng dẫn khởi tạo và seed tại `backend/README.md`. Dữ liệu seed mặc định ở trạng thái nháp và không tự hiện trên API công khai. Nội dung, tọa độ và các địa điểm mẫu cần được kiểm duyệt. Không đưa địa chỉ cá nhân hoặc thông tin bí mật vào Git; biến `EXPO_PUBLIC_*` được nhúng vào ứng dụng và không phải nơi lưu bí mật.

## Ngôn ngữ, quyền và TTS

Tab Tự phát có hai lựa chọn độc lập: ngôn ngữ giao diện VI/EN và ngôn ngữ thuyết minh. Danh mục dùng tên tiếng Anh từ API nếu có, nếu thiếu thì giữ tên tiếng Việt. Tên địa điểm và nội dung thuyết minh hiển thị theo dữ liệu thực tế; thiếu bài ở ngôn ngữ đã chọn được thông báo, không tự dịch hoặc đổi bài.

Ứng dụng chỉ xin quyền vị trí khi người dùng yêu cầu, không xin quyền nền; từ chối quyền vẫn có thể xem địa điểm và nghe thủ công. TTS chỉ thử phát khi thiết bị liệt kê được giọng có mã ngôn ngữ phù hợp và có định danh; không xác nhận được giọng thì báo lỗi và vẫn cho đọc văn bản. Cần kiểm tra giọng, GPS và bản đồ trên điện thoại thật.

Logic địa lý hiện yêu cầu ở trong vùng 5 giây, và chỉ phát lại sau khi đã rời vùng rồi quay lại ít nhất 600 giây sau lần phát trước. Khoảng cách giữa hai mẫu GPS hợp lệ quá 15 giây làm tính lại khoảng xác nhận; mẫu không có độ chính xác bị bỏ. Đây là các giả định cần nhóm xác nhận và thử thực địa. Với Android build riêng, bản đồ có thể cần cấu hình khóa Google Maps; không đưa khóa vào Git.

API heartbeat/rút đồng ý thống kê chưa có trong backend. Mobile hiện không gửi thống kê, không hiện yêu cầu đồng ý mới và thông báo rõ trong tab Riêng tư. Một yêu cầu rút đồng ý tồn đọng từ bản trước được giữ lại; chưa thể xác nhận server đã nhận cho đến khi backend hỗ trợ.

## Kiểm thử

```powershell
npm.cmd test -- --runInBand
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir <THU-MUC-OUTPUT-MOI>
```

Kiểm thử API thật tùy chọn dùng backend thử nghiệm được tạo riêng; đặt `SAIGON_TEST_API_URL=http://127.0.0.1:18082/api` khi chạy Jest và khởi động fixture `apps/guest-web/tests/serve_api.py` từ gốc repo. Không trỏ kiểm thử tới dữ liệu vận hành.

Kiểm thử trên thiết bị thật: **chưa kiểm thử**. Xem checklist tại [mobile-field-test.md](../../docs/mobile/testing/mobile-field-test.md). Bundle thành công không chứng minh GPS, quyền, giọng đọc, bản đồ hoặc kết nối LAN hoạt động trên thiết bị.
