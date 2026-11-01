# Thiết kế API

Các nhóm chức năng cần có:

1. Địa điểm, danh mục và nội dung công khai cho khách.
2. Đăng nhập, đăng xuất và kiểm tra phiên Admin.
3. Quản trị danh mục, địa điểm, bài thuyết minh và trạng thái công bố.
4. Nhận tín hiệu thống kê và yêu cầu rút đồng ý.
5. Thống kê lượt truy cập và phiên đang hoạt động dành cho Admin.

## Hợp đồng v0.1 — phần đã triển khai và đề xuất cần thống nhất

Ngoại trừ các route được liệt kê ngay dưới đây, các đường dẫn và dữ liệu trong tài liệu là **thiết kế dự kiến**, cần nhóm thống nhất. Các mã `id` trong ví dụ được rút gọn cho dễ đọc; thực tế dùng UUID. Prefix `/api/v1`; thời gian UTC ISO 8601. Không lưu lịch sử tọa độ khách. Client không được dựa vào việc ẩn nút để bảo vệ API quản trị.

### Đã triển khai trong backend bước đầu

`GET /api/v1/health` kiểm tra tiến trình. `POST /api/v1/admin/login`, `GET /api/v1/admin/me`, `POST /api/v1/admin/logout` và `GET/POST/PATCH/DELETE /api/v1/admin/categories` (PATCH/DELETE có `/{id}`) đã được kiểm thử bằng `TestClient`. Các route quản trị trừ login yêu cầu `Authorization: Bearer <token>`. Response 204 không có body; các lỗi định dạng `{"error":{"code":"...","message":"...","details":[]}}`. Với endpoint đã triển khai: body không hợp lệ trả `422 VALIDATION_ERROR`; không có/sai/hết hạn/thu hồi token trả `401 AUTH_REQUIRED`; thông tin đăng nhập sai hoặc tài khoản bị khóa trả cùng `401 INVALID_CREDENTIALS`; danh mục trùng trả `409 CATEGORY_DUPLICATE`, đang được dùng trả `409 CATEGORY_IN_USE`, không tìm thấy trả `404 CATEGORY_NOT_FOUND`. Không có `429` vì chưa có rate limiting.

Login nhận `{"username":"...","password":"..."}`, trả `{"access_token":"...","expires_at":"..."}` và `Cache-Control: no-store`; token là bearer ngẫu nhiên, lưu hash SHA-256 và hết hạn sau 8 giờ. API chưa có đăng ký Admin. Phía web cần thống nhất nơi giữ token, xử lý 401 và logout, bảo vệ HTTPS và CORS; chưa có cơ chế rate limiting hoặc dọn phiên hết hạn. `name` danh mục tối đa 200 ký tự trước khi trim; `username` tối đa 150 và mật khẩu tối đa 1024 ký tự. Health không xác nhận database đã sẵn sàng. Các giới hạn này là lựa chọn hiện tại cho nhóm xem xét, không phải cam kết production.

Phản hồi lỗi đề xuất: `{"error":{"code":"VALIDATION_ERROR","message":"Dữ liệu không hợp lệ","details":[]}}`. Quy ước: `400` JSON/tham số sai, `401` chưa xác thực hoặc phiên hết hạn, `403` thiếu quyền, `404` không tìm thấy hoặc POI không công khai, `409` xung đột/trạng thái không hợp lệ, `422` dữ liệu vi phạm quy tắc, `429` quá nhiều lần thử nếu có giới hạn, `500` lỗi máy chủ. Không trả token, hash hoặc nội dung lỗi nội bộ trong thông báo. Đây là quy ước đề xuất, có thể điều chỉnh sau khi nhóm chọn cơ chế validation.

### Khách, không cần đăng nhập

Ba route bên dưới đã triển khai. Danh sách và chi tiết chỉ đọc `published`; địa điểm không tồn tại, nháp hoặc ẩn đều trả `404 POI_NOT_FOUND` ở chi tiết. `q` tìm chuỗi con theo tên sau NFC và casefold, có thể kết hợp `category_id`. Danh sách có thêm `narration_locales`; chi tiết có cả `narration_locales` và `narrations` gồm `locale`, `title`, `body`. API chưa phân trang, tìm kiếm tên lọc trong bộ nhớ nên cần xem xét lại khi dữ liệu lớn.

| Phương thức và đường dẫn | Chức năng; dữ liệu gửi | Thành công; lỗi điển hình |
| --- | --- | --- |
| `GET /api/v1/categories` | Danh mục; không body | `200 {"items":[{"id":"cat-1","name":"Di tích"}]}`; `500` |
| `GET /api/v1/pois?q=...&category_id=...` | Tìm tên, lọc danh mục, kết hợp được; chỉ `published`; tham số tùy chọn | `200 {"items":[{"id":"poi-1","name":"Dinh Độc Lập","category_id":"cat-1","address":"...","latitude":10.777,"longitude":106.6953,"radius_m":100,"image_url":null}]}`; rỗng `items:[]`; `400` |
| `GET /api/v1/pois/{id}` | Chi tiết công khai và bài khả dụng; không body | `200 {"id":"poi-1","name":"Dinh Độc Lập","category_id":"cat-1","address":"...","latitude":10.777,"longitude":106.6953,"radius_m":100,"image_url":null,"narrations":[{"locale":"vi","title":"...","body":"..."}]}`; `404` |

Danh sách POI cung cấp tọa độ để client tương lai vẽ bản đồ; tìm kiếm và lọc được xử lý ở API, còn TTS chưa triển khai. Không công khai địa điểm nháp hoặc ẩn.

### Xác thực và quản trị

Token phiên dùng `Authorization: Bearer <token>`; chỉ lưu hash token phía server, thu hồi khi đăng xuất. Web cần thống nhất cách lưu phiên an toàn, HTTPS và bảo vệ tương ứng; không có đăng ký Admin công khai. Tài khoản seed dùng PBKDF2 được mô tả trong [script README](../../backend/scripts/README.md), API đã có xác minh định dạng này.

| Phương thức và đường dẫn | Quyền / chức năng; body ví dụ | Thành công; lỗi điển hình |
| --- | --- | --- |
| `POST /api/v1/admin/login` | Công khai; `{"username":"demo-admin","password":"<nhập khi chạy>"}` | `200 {"access_token":"<token>","expires_at":"2026-11-01T12:00:00Z"}`; `401`, `429` |
| `GET /api/v1/admin/me` | Admin; không body | `200 {"id":"admin-1","username":"demo-admin"}`; `401` |
| `POST /api/v1/admin/logout` | Admin; không body, thu hồi phiên | `204` không body; `401` |
| `GET /api/v1/admin/categories` | Admin; không body | `200 {"items":[{"id":"cat-1","name":"Di tích"}]}`; `401` |
| `POST /api/v1/admin/categories` | Admin; `{"name":"Di tích"}` | `201 {"id":"cat-1","name":"Di tích"}`; `401`, `409`, `422` |
| `PATCH /api/v1/admin/categories/{id}` | Admin; `{"name":"Văn hóa"}` | `200 {"id":"cat-1","name":"Văn hóa"}`; `404`, `409`, `422` |
| `DELETE /api/v1/admin/categories/{id}` | Admin; không body | `204`; `404`, `409` nếu đang được dùng |
| `GET /api/v1/admin/pois` | Admin; không body; gồm nháp, công khai, ẩn | `200 {"items":[{"id":"poi-1","name":"Dinh Độc Lập","status":"draft"}]}`; `401` |
| `GET /api/v1/admin/pois/{id}` | Admin; không body | `200 {"id":"poi-1","category_id":"cat-1","name":"Dinh Độc Lập","address":"...","latitude":10.777,"longitude":106.6953,"radius_m":100,"image_url":null,"status":"draft","narrations":[{"locale":"vi","title":"...","body":"..."}]}`; `404` |
| `POST /api/v1/admin/pois` | Admin; `{"category_id":"cat-1","name":"Dinh Độc Lập","address":"...","latitude":10.777,"longitude":106.6953,"radius_m":100,"image_url":null}` | `201 {"id":"poi-1","status":"draft"}`; `404`, `422` |
| `PATCH /api/v1/admin/pois/{id}` | Admin; cập nhật một phần, ví dụ `{"address":"...","radius_m":150}`; không đổi trạng thái qua route này | `200 {"id":"poi-1","status":"draft","address":"...","radius_m":150}`; `404`, `422` |
| `DELETE /api/v1/admin/pois/{id}` | Admin; client yêu cầu xác nhận trước; không body | `204`; `404`; xóa bài liên quan |
| `PUT /api/v1/admin/pois/{id}/narrations/{locale}` | Admin; tạo hoặc thay bài: `{"title":"...","body":"..."}` | `200 {"poi_id":"poi-1","locale":"vi","title":"...","body":"..."}`; `404`, `422` |
| `DELETE /api/v1/admin/pois/{id}/narrations/{locale}` | Admin; không body; không để địa điểm công khai mất bài hợp lệ cuối cùng | `204`; `404`, `409` |
| `PUT /api/v1/admin/pois/{id}/status` | Admin; `{"status":"published"}` hoặc `{"status":"hidden"}` | `200 {"id":"poi-1","status":"published"}`; `404`, `409`, `422` |

Mọi route quản trị còn có thể trả `401`/`403`. Tên danh mục được trim, NFC và casefold trước khi so trùng. POI mới là `draft`; giới hạn vĩ độ −90..90, kinh độ −180..180, bán kính 20..1000 m. Công bố cần ít nhất một bài hợp lệ, xử lý kiểm tra và cập nhật trong cùng transaction. Chỉnh sửa bài/POI công khai phải giữ điều kiện công bố. `locale` hợp lệ theo danh sách nhóm thống nhất; mỗi cặp POI/locale tối đa một bài. Nguồn ảnh và upload cần thiết kế riêng, `image_url` chỉ là tham chiếu tùy chọn.

### Thống kê ẩn danh

Client chỉ tạo UUID ngẫu nhiên và gửi heartbeat sau khi khách đồng ý; khi chưa chọn/từ chối không gửi. `session_id` là mã ngẫu nhiên do client tạo, không chứa thông tin cá nhân. Các route sau không đòi đăng nhập khách; chỉ route Admin cần phiên Admin.

| Phương thức và đường dẫn | Chức năng; body ví dụ | Thành công; lỗi điển hình |
| --- | --- | --- |
| `POST /api/v1/analytics/heartbeat` | Sau đồng ý, `{"session_id":"<uuid>"}`; khi hiển thị, lặp 30 giây | `204`; `400`, `422`, `500` |
| `POST /api/v1/analytics/withdraw` | Rút đồng ý, `{"session_id":"<uuid>"}`; client dừng gửi ngay và thử lại khi mất mạng | `204` kể cả đã xử lý; `400`, `422`, `500` |
| `GET /api/v1/admin/analytics/visits?from=2026-10-26&to=2026-11-01` | Admin; hai đầu ngày trong 30 ngày gần nhất theo Asia/Ho_Chi_Minh | `200 {"from":"2026-10-26","to":"2026-11-01","total":2,"daily":[{"date":"2026-10-26","count":0},{"date":"2026-10-27","count":0},{"date":"2026-10-28","count":0},{"date":"2026-10-29","count":0},{"date":"2026-10-30","count":0},{"date":"2026-10-31","count":1},{"date":"2026-11-01","count":1}]}`; `401`, `422`, `500` |
| `GET /api/v1/admin/analytics/active` | Admin; không body; độc lập bộ lọc ngày | `200 {"active_sessions":3,"measured_at":"2026-11-01T12:00:00Z"}`; `401`, `500` |

Heartbeat đầu hoặc sau từ 30 phút gián đoạn tạo lượt, các heartbeat liên tục không tạo lượt mới; server cần giao dịch chống ghi trùng. Hoạt động là số phiên đã đồng ý với `last_seen` trong 90 giây, không phải số người duy nhất. Khi rút, server loại phiên khỏi số đang hoạt động và tách mã khỏi lượt cũ; lượt được giữ đến hết hạn 30 ngày. Cần thống nhất cơ chế chống heartbeat đến muộn sau khi rút, lưu dấu rút và thời hạn dấu này trước khi triển khai; không coi bảng hiện có đã giải quyết việc đó. Lỗi truy vấn phải trả lỗi, không giả thành 0.
