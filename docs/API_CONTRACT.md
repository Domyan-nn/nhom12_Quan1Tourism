# Hợp đồng API – Saigon Stories Quận 1

Cập nhật 02/11/2026 theo mã FastAPI. Tài liệu này là nguồn chung cho client; [api-design.md](analysis-design/api-design.md) mô tả phạm vi và dẫn về đây. Bản đề xuất ngày 01/11 chưa có xác nhận nhóm; các đường dẫn cũ `/api/public/**`, `/api/admin/auth/**`, `/api/health` không phải API đang chạy.

## 1. Quy ước đã triển khai

- Base URL: `/api/v1`. Dev backend: `http://127.0.0.1:8000`; Admin 5174 và guest 5173 dùng proxy `/api` về backend. Proxy Vite chỉ áp dụng khi dev; build tĩnh cần reverse proxy riêng. Backend chưa cấu hình CORS cho origin độc lập.
- JSON UTF-8, tên trường snake_case. ID công khai là chuỗi opaque; seed dùng UUID ổn định, client không kiểm tra UUID v4 cho POI/danh mục.
- Danh sách trả `{"items":[...]}`; kết quả rỗng là `200 {"items":[]}`. Chi tiết trả object trực tiếp. Chưa phân trang.
- Ngôn ngữ giao diện guest: VI/EN. Ngôn ngữ thuyết minh lấy từ dữ liệu, độc lập với giao diện; không giới hạn còn hai ngôn ngữ và không tự tạo bản dịch.
- Chỉ POI `published` xuất hiện ở Public. `draft`, `hidden` và ID không tồn tại cùng trả `404 POI_NOT_FOUND` ở chi tiết.
- Thời gian Admin là ISO 8601 UTC của backend, không cam kết độ dài 24. Định dạng cố định cho **hai bảng analytics** được quy định riêng tại mục 5.
- `image_url` có thể null. Chưa có API upload hoặc phục vụ `/media` trong FastAPI hiện tại.

## 2. Public API đã triển khai

| Phương thức, đường dẫn | Tham số | Thành công |
| --- | --- | --- |
| GET /api/v1/health | Không | 200 `{"status":"ok"}`; chỉ kiểm tra tiến trình, không kiểm tra database |
| GET /api/v1/categories | Không | 200 `{"items":[{"id":"cat-1","name":"Di tích","name_en":"Heritage"}]}` |
| GET /api/v1/pois | `q`, `category_id` đều tùy chọn | 200 `{"items":[<POI tóm tắt>]}` |
| GET /api/v1/pois/{id} | ID chuỗi | 200 POI chi tiết; 404 nếu không công khai/không tồn tại |

`q` được trim, chuẩn hóa NFC và casefold; tìm chuỗi con trong tên, giữ phân biệt dấu. `category_id` lọc chính xác; kết hợp với tìm tên bằng AND. Danh mục không tồn tại trả danh sách rỗng. POI sắp theo name rồi ID; danh mục sắp theo normalized_name rồi ID. Danh mục trả toàn bộ danh mục, kể cả danh mục chưa có POI công khai.

POI tóm tắt:

```json
{
  "id": "poi-1", "name": "Dinh Độc Lập", "category_id": "cat-1",
  "address": "...", "latitude": 10.777, "longitude": 106.6953,
  "radius_m": 100, "image_url": null, "narration_locales": ["en", "vi"]
}
```

Chi tiết có cùng các trường trên và thêm:

```json
{
  "narrations": [
    {"locale": "en", "title": "Example title", "body": "Example text"},
    {"locale": "vi", "title": "Tiêu đề ví dụ", "body": "Nội dung ví dụ"}
  ]
}
```

Hai ví dụ là mô tả shape, không xác nhận nội dung dịch có trong database. Bài khả dụng phải có title/body không rỗng sau trim. `narration_locales` và `narrations` sắp theo mã locale; không hứa VI đứng đầu. Danh sách không kèm body; client cần bài phải gọi chi tiết. Không trả status, thời gian chỉnh sửa hoặc dữ liệu Admin.

## 3. Admin đã triển khai

Ngoại trừ login, mọi route Admin yêu cầu `Authorization: Bearer <token>`. Backend kiểm tra phiên, thời hạn, thu hồi và trạng thái tài khoản ở mỗi request.

| Phương thức, đường dẫn | Request | Thành công |
| --- | --- | --- |
| POST /api/v1/admin/login | `{"username":"demo-admin","password":"..."}` | 200 `{"access_token":"...","expires_at":"..."}`; Cache-Control: no-store |
| GET /api/v1/admin/me | Không body | 200 `{"id":"...","username":"..."}` |
| POST /api/v1/admin/logout | Không body | 204 không body; thu hồi phiên |
| GET /api/v1/admin/categories | Không body | 200 `{"items":[{"id":"...","name":"...","name_en":"..."}]}` |
| POST /api/v1/admin/categories | `{"name":"...","name_en":"..."}` | 201 `{"id":"...","name":"...","name_en":"..."}` |
| PATCH /api/v1/admin/categories/{id} | `{"name":"...","name_en":"..."}` | 200 `{"id":"...","name":"...","name_en":"..."}` |
| DELETE /api/v1/admin/categories/{id} | Không body | 204 không body |

Token ngẫu nhiên, chỉ lưu hash, hết hạn sau 8 giờ. Không có đăng ký Admin công khai. Hai tên danh mục là bắt buộc khi tạo hoặc sửa, mỗi tên tối đa 200 ký tự trước trim, được trim/NFC và casefold để so trùng riêng theo ngôn ngữ. `name` là tiếng Việt; `name_en` có thể là null đối với dữ liệu cũ chưa được dịch. Username tối đa 150, password tối đa 1024 ký tự. Giới hạn hiện tại chưa phải cam kết production.

## 4. Lỗi thực tế

```json
{"error":{"code":"POI_NOT_FOUND","message":"Không tìm thấy địa điểm.","details":[]}}
```

Client xử lý theo code/status, không phân tích chuỗi message. Message backend hiện là tiếng Việt; guest web dịch thông báo giao diện VI/EN dựa vào trạng thái/code. Backend không trả body đầu vào hoặc password trong lỗi validation.

| HTTP | Code | Tình huống |
| --- | --- | --- |
| 401 | INVALID_CREDENTIALS | Sai thông tin đăng nhập hoặc tài khoản bị khóa, cùng thông báo |
| 401 | AUTH_REQUIRED | Thiếu/sai/hết hạn/thu hồi token hoặc tài khoản không còn hoạt động |
| 404 | POI_NOT_FOUND | POI không tồn tại hoặc không công khai |
| 404 | CATEGORY_NOT_FOUND | Không tìm thấy danh mục khi sửa/xóa |
| 409 | CATEGORY_DUPLICATE | Trùng tên chuẩn hóa |
| 409 | CATEGORY_IN_USE | Xóa danh mục đang có POI sử dụng |
| 422 | VALIDATION_ERROR | Sai request; details hiện là mảng rỗng |
| 500 | DATABASE_ERROR | Lỗi SQLite, không lộ chi tiết nội bộ |
| Tùy trường hợp | HTTP_ERROR | Lỗi HTTP khác, gồm route không tồn tại |

Chưa triển khai rate limiting, nên không cam kết 429. Chưa ánh xạ SQLite lock thành 503; hiện thuộc DATABASE_ERROR.

## 5. Schema analytics đã có, API chưa có

DDL chuẩn là [002_analytics_constraints.sql](../backend/migrations/002_analytics_constraints.sql). `001_initial.sql` được giữ làm lịch sử; init mới chạy 001 rồi 002. [schema_analytics.sql](../backend/data/schema_analytics.sql) chỉ còn truy vấn tham chiếu, không còn DDL song song.

- `anonymous_sessions.session_id` và `visit_events.id`: UUID v4 chuẩn, chữ thường, đủ dấu gạch nối, variant hợp lệ.
- `consent_granted`: INTEGER 0/1, mặc định 1.
- `created_at`, `last_seen_at`, `started_at`: UTC hợp lệ theo `YYYY-MM-DDTHH:MM:SS.mmmZ`, 24 ký tự; kiểm tra cả ngày giờ hợp lệ, không chỉ độ dài; `last_seen_at >= created_at`.
- `visit_events.session_id` cho phép NULL; giá trị khác NULL phải tham chiếu phiên tồn tại; ON DELETE SET NULL.
- Chỉ mục: `idx_anonymous_sessions_last_seen_at`, `idx_visit_events_session_id`, `idx_visit_events_started_at`.
- Nâng cấp dùng [migrate_db.py](../backend/scripts/migrate_db.py) theo [hướng dẫn](../backend/README.md#nâng-cấp-schema-thống-kê). Không tự sửa UUID, đổi thời gian hoặc xóa dòng sai.

## 6. Chức năng đề xuất, chưa triển khai

Các đường dẫn dưới đây là phương án thống nhất để nhóm review sau; không phải route khả dụng và không phải xác nhận hoàn tất WBS-08/WBS-09.

| Nhóm | Đề xuất cho giai đoạn tiếp theo |
| --- | --- |
| Analytics | POST /api/v1/analytics/heartbeat: body `{"session_id":"<uuid-v4>"}`; dự kiến 200 `{"session_id":"...","visit_recorded":true,"server_time":"..."}` |
| Rút đồng ý | POST /api/v1/analytics/revoke: cùng body; dự kiến 204 idempotent |
| Thống kê Admin | GET /api/v1/admin/stats/visits?from=YYYY-MM-DD&to=YYYY-MM-DD và GET /api/v1/admin/stats/active |
| Quản lý POI, bài, công bố | CRUD dưới /api/v1/admin/pois; request/response chi tiết cần review trước triển khai |
| Ảnh | Upload và phục vụ ảnh cần thiết kế riêng |

Quy tắc mục tiêu từ PRD: chỉ gửi sau đồng ý; heartbeat 30 giây khi hiển thị/có mạng, lượt mới sau gián đoạn từ 30 phút; hoạt động là phiên trong 90 giây; ngày VN, cửa sổ 30 ngày; rút đồng ý dừng gửi, loại khỏi active và tách mã khỏi lượt cũ; lỗi thống kê không giả thành số 0. Chưa có API, lịch dọn dữ liệu, dashboard hay cam kết thời hạn lưu đang vận hành. Cần chốt TTL dấu thu hồi, rate limiting, request/response và kiểm thử đồng thời trước khi bật.

Mobile còn adapter `contract` cho đường dẫn cũ và analytics gọi `/api/analytics/**`; các route đó không tồn tại. Trong đợt này chỉ guest web được tích hợp; mobile dùng public style `v1` khi thử API hiện tại, analytics vẫn chờ triển khai.

## 7. Xác nhận nhóm còn cần

Phần Public/Admin ở trên ghi nhận mã đã có, không giả định đã có phê duyệt sản phẩm. Nhóm cần review ràng buộc analytics chặt hơn trước khi áp dụng lên database riêng, các đề xuất mục 6 và bộ locale/nội dung được kiểm duyệt. Chưa có xác nhận thành viên nào được thêm vào tài liệu.
# Admin: địa điểm và thuyết minh (03/11/2026)

Các endpoint dưới đây yêu cầu `Authorization: Bearer <token>`; phiên thiếu, sai, hết hạn hoặc bị thu hồi trả 401 `AUTH_REQUIRED`. Response lỗi dạng `{ "error": { "code": "...", "message": "...", "details": [] } }`. Lỗi 422 không trả dữ liệu đã nhập.

* `GET /api/v1/admin/pois` trả `{ "items": [ ... ] }` gồm mọi trạng thái; `GET /api/v1/admin/pois/{id}` trả một bản ghi hoặc 404 `POI_NOT_FOUND`.
* `POST /api/v1/admin/pois` trả 201 và bản ghi mới `status: "draft"`; `PUT /api/v1/admin/pois/{id}` thay các trường biên tập, giữ trạng thái cũ. Body: `{ "category_id": "id", "name": "Tên", "address": "Địa chỉ", "latitude": 10.7, "longitude": 106.7, "radius_m": 100, "image_url": null }`. Tên và địa chỉ bắt buộc, danh mục phải tồn tại, tọa độ lần lượt trong [-90,90] và [-180,180], bán kính nguyên 20–1000; URL ảnh tùy chọn phải dùng HTTP(S). Sai dữ liệu trả 422; danh mục không tồn tại có mã `CATEGORY_NOT_FOUND`.
* `DELETE /api/v1/admin/pois/{id}` trả 204, xóa các thuyết minh liên quan theo khóa ngoại CASCADE; không tồn tại trả 404.
* `GET /api/v1/admin/pois/{id}/narrations` trả `{ "items": [ ... ] }`. `POST` cùng đường dẫn nhận `{ "locale": "vi", "title": "Tiêu đề", "body": "Nội dung" }`, trả 201; mã được chuẩn hóa chữ thường, gồm 2–3 chữ cái và các phần tùy chọn phân cách bằng dấu gạch ngang. Mỗi ngôn ngữ chỉ có một bài cho một địa điểm; trùng trả 409 `NARRATION_DUPLICATE`. `PUT /api/v1/admin/pois/{id}/narrations/{narration_id}` nhận `{ "title": "...", "body": "..." }`, giữ nguyên locale và trả bài đã lưu. Thiếu địa điểm hoặc bài trả 404; tiêu đề/nội dung rỗng hoặc sai định dạng trả 422.

Không có API upload hoặc phục vụ ảnh mới; URL do quản trị viên cung cấp. Không có endpoint xóa riêng bài hay thay đổi trạng thái công bố trong phạm vi này. Không thay schema hoặc chạy migration; API công khai giữ nguyên.
