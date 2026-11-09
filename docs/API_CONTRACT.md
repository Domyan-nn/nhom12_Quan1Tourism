# Hợp đồng API – Saigon Stories Quận 1

Cập nhật 06/11/2026 theo mã FastAPI. Tài liệu này là nguồn chung cho client; [api-design.md](analysis-design/api-design.md) mô tả phạm vi và dẫn về đây. Các đường dẫn cũ `/api/public/**`, `/api/admin/auth/**`, `/api/health` không phải API đang chạy.

## 1. Quy ước đã triển khai

- Base URL: `/api/v1`. Dev backend: `http://127.0.0.1:8000`; Admin 5174 và guest 5173 dùng proxy `/api` về backend. Proxy Vite chỉ áp dụng khi dev; build tĩnh cần reverse proxy riêng. Backend chưa cấu hình CORS cho origin độc lập.
- JSON UTF-8, tên trường snake_case. ID công khai là chuỗi opaque; seed dùng UUID ổn định, client không kiểm tra UUID v4 cho POI/danh mục.
- Danh sách trả `{"items":[...]}`; kết quả rỗng là `200 {"items":[]}`. Chi tiết trả object trực tiếp. Chưa phân trang.
- Ngôn ngữ giao diện guest: VI/EN. Ngôn ngữ thuyết minh lấy từ dữ liệu, độc lập với giao diện; không giới hạn còn hai ngôn ngữ và không tự tạo bản dịch.
- Chỉ POI `published` xuất hiện ở Public. `draft`, `hidden` và ID không tồn tại cùng trả `404 POI_NOT_FOUND` ở chi tiết.
- Thời gian Admin là ISO 8601 UTC của backend, không cam kết độ dài 24. Định dạng cố định cho **hai bảng analytics** được quy định riêng tại mục 5.
- `image_url` có thể null; là URL HTTP(S) hoặc đường dẫn ảnh đã tải lên `/api/media/pois/<uuid>.<jpg|png|webp>` (phục vụ công khai, qua proxy `/api` sẵn có). `image_credit` (tác giả, giấy phép, nguồn; có thể null) đi kèm ảnh và phải hiển thị dưới ảnh (09/11).

## 2. Public API đã triển khai

| Phương thức, đường dẫn | Tham số | Thành công |
| --- | --- | --- |
| GET /api/v1/health | Không | 200 `{"status":"ok"}`; chỉ kiểm tra tiến trình, không kiểm tra database |
| GET /api/v1/categories | Không | 200 `{"items":[{"id":"cat-1","name":"Di tích","name_en":"Heritage"}]}` |
| GET /api/v1/locales | Không | 200 `{"items":[{"code":"vi","name":"Tiếng Việt","name_en":"Vietnamese","speech_tag":"vi-VN"}, ...]}`; ngôn ngữ thuyết minh được hỗ trợ (09/11) |
| GET /api/v1/pois | `q`, `category_id` đều tùy chọn | 200 `{"items":[<POI tóm tắt>]}` |
| GET /api/v1/pois/{id} | ID chuỗi | 200 POI chi tiết; 404 nếu không công khai/không tồn tại |

`q` được trim, bỏ dấu tiếng Việt (kể cả `đ`) và casefold ở cả từ khóa lẫn tên, rồi tìm chuỗi con: "ben thanh" khớp "Chợ Bến Thành" (09/11; trước đó phân biệt dấu). `category_id` lọc chính xác; kết hợp với tìm tên bằng AND. Danh mục không tồn tại trả danh sách rỗng. POI sắp theo name rồi ID; danh mục sắp theo normalized_name rồi ID. Danh mục trả toàn bộ danh mục, kể cả danh mục chưa có POI công khai.

POI tóm tắt:

```json
{
  "id": "poi-1", "name": "Dinh Độc Lập", "category_id": "cat-1",
  "address": "...", "latitude": 10.777, "longitude": 106.6953,
  "radius_m": 100, "image_url": null, "image_credit": null, "narration_locales": ["en", "vi"]
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
| POST /api/v1/admin/login | `{"username":"demo-admin","password":"..."}` | 200 `{"access_token":"...","expires_at":"..."}`; Cache-Control: no-store. Sai 5 lần trong 15 phút cho cùng username thì trả 429 kèm `Retry-After` |
| GET /api/v1/admin/me | Không body | 200 `{"id":"...","username":"..."}` |
| POST /api/v1/admin/logout | Không body | 204 không body; thu hồi phiên |
| GET /api/v1/admin/categories | Không body | 200 `{"items":[{"id":"...","name":"...","name_en":"..."}]}` |
| POST /api/v1/admin/categories | `{"name":"...","name_en":"..."}` | 201 `{"id":"...","name":"...","name_en":"..."}` |
| PATCH /api/v1/admin/categories/{id} | `{"name":"...","name_en":"..."}` | 200 `{"id":"...","name":"...","name_en":"..."}` |
| DELETE /api/v1/admin/categories/{id} | Không body | 204 không body |

Token ngẫu nhiên, chỉ lưu hash, hết hạn sau 8 giờ. Không có đăng ký Admin công khai. Hai tên danh mục là bắt buộc khi tạo hoặc sửa, mỗi tên tối đa 200 ký tự trước trim, được trim/NFC và casefold để so trùng riêng theo ngôn ngữ. `name` là tiếng Việt; `name_en` có thể là null đối với dữ liệu cũ chưa được dịch. Username tối đa 150, password tối đa 1024 ký tự. Bộ đếm đăng nhập sai nằm trong bộ nhớ tiến trình API (khởi động lại thì về 0), tính theo username đã chuẩn hóa, kể cả tên không tồn tại; khi đang bị khóa, mật khẩu không được kiểm tra. Mỗi lần đăng nhập thành công xóa phiên đã hết hạn quá 7 ngày. Giới hạn hiện tại chưa phải cam kết production.

## 4. Lỗi thực tế

```json
{"error":{"code":"POI_NOT_FOUND","message":"Không tìm thấy địa điểm.","details":[]}}
```

Client xử lý theo code/status, không phân tích chuỗi message. Message backend hiện là tiếng Việt; guest web dịch thông báo giao diện VI/EN dựa vào trạng thái/code. Backend không trả body đầu vào hoặc password trong lỗi validation.

| HTTP | Code | Tình huống |
| --- | --- | --- |
| 401 | INVALID_CREDENTIALS | Sai thông tin đăng nhập hoặc tài khoản bị khóa, cùng thông báo |
| 401 | AUTH_REQUIRED | Thiếu/sai/hết hạn/thu hồi token hoặc tài khoản không còn hoạt động |
| 429 | TOO_MANY_ATTEMPTS | Đăng nhập sai quá 5 lần trong 15 phút; header `Retry-After` là số giây cần chờ |
| 404 | POI_NOT_FOUND | POI không tồn tại hoặc không công khai |
| 404 | CATEGORY_NOT_FOUND | Không tìm thấy danh mục khi sửa/xóa |
| 409 | CATEGORY_DUPLICATE | Trùng tên chuẩn hóa |
| 409 | CATEGORY_IN_USE | Xóa danh mục đang có POI sử dụng |
| 409 | NARRATION_REQUIRED | Xóa bài thuyết minh hợp lệ cuối cùng của POI đang công khai |
| 413 | IMAGE_TOO_LARGE | Ảnh tải lên quá 2 MB |
| 415 | UNSUPPORTED_IMAGE_TYPE | Ảnh không phải JPG, PNG, WebP |
| 422 | INVALID_IMAGE | Nội dung tệp không khớp loại ảnh đã khai báo |
| 422 | VALIDATION_ERROR | Sai request; details hiện là mảng rỗng |
| 500 | DATABASE_ERROR | Lỗi SQLite, không lộ chi tiết nội bộ |
| Tùy trường hợp | HTTP_ERROR | Lỗi HTTP khác, gồm route không tồn tại |

Rate limiting chỉ áp dụng cho đăng nhập Admin (429 ở trên). Chưa ánh xạ SQLite lock thành 503; hiện thuộc DATABASE_ERROR.

## 5. Analytics UC12 đã tích hợp

Không cần đăng nhập. Heartbeat đầu tiên là khai báo đồng ý của client; backend không có endpoint tạo phiên trước đồng ý. Client có trách nhiệm không tạo UUID/gọi heartbeat trước lựa chọn của khách. Chỉ ứng dụng khách gửi heartbeat, thao tác Admin không được tính.

| Phương thức, đường dẫn | Request | Kết quả |
| --- | --- | --- |
| POST /api/v1/analytics/heartbeat | `{"session_id":"<uuid-v4>"}` | 204 không body; 409 nếu mã đã rút đồng ý |
| POST /api/v1/analytics/revoke | Cùng body | 204 không body, idempotent kể cả khi chưa có heartbeat |

Giữ hai alias `/api/analytics/heartbeat` và `/api/analytics/revoke` của An, cùng nghiệp vụ và database. UUID v4 đúng variant, đủ dấu gạch nối; đầu vào chữ hoa được chuẩn hóa chữ thường. UUID sai phiên bản/variant trả 422 thay vì lỗi SQLite 500. Lỗi phiên đã rút giữ `{"detail":"session_revoked"}` cho client cũ và thêm envelope `error` với `code: "session_revoked"`.

Mỗi request dùng kết nối riêng, bật khóa ngoại, busy timeout 10 giây. Giao dịch `BEGIN IMMEDIATE` tuần tự hóa heartbeat/revoke: tín hiệu đầu tiên ghi một lượt; từ 30 phút không có tín hiệu thì ghi lượt mới, heartbeat liên tục chỉ tăng `last_seen_at`. Revoke tách mã khỏi lượt cũ, giữ tổng số lượt và đặt `consent_granted=0`; nếu mã chưa tồn tại thì tạo dấu thu hồi để chặn heartbeat đến muộn. Không có cơ chế kích hoạt lại mã đã thu hồi khi dấu còn trong database; đồng ý lại dùng UUID mới.

DDL chuẩn là [002_analytics_constraints.sql](../backend/migrations/002_analytics_constraints.sql). `001_initial.sql` được giữ làm lịch sử; init mới chạy 001, 002 rồi 003 (xem [migrations/README.md](../backend/migrations/README.md)). [analytics-schema-reference.sql](analysis-design/analytics-schema-reference.sql) chỉ còn truy vấn tham chiếu, không còn DDL song song.

- `anonymous_sessions.session_id` và `visit_events.id`: UUID v4 chuẩn, chữ thường, đủ dấu gạch nối, variant hợp lệ.
- `consent_granted`: INTEGER 0/1, mặc định 1.
- `created_at`, `last_seen_at`, `started_at`: UTC hợp lệ theo `YYYY-MM-DDTHH:MM:SS.mmmZ`, 24 ký tự; kiểm tra cả ngày giờ hợp lệ, không chỉ độ dài; `last_seen_at >= created_at`.
- `visit_events.session_id` cho phép NULL; giá trị khác NULL phải tham chiếu phiên tồn tại; ON DELETE SET NULL.
- Chỉ mục: `idx_anonymous_sessions_last_seen_at`, `idx_visit_events_session_id`, `idx_visit_events_started_at`.
- Nâng cấp dùng [migrate_db.py](../backend/scripts/migrate_db.py) theo [hướng dẫn](../RUNNING.md). Không tự sửa UUID, đổi thời gian hoặc xóa dòng sai.

Không đổi schema trong đợt tích hợp này. API kiểm tra schema analytics phiên bản 2 trước khi dọn dữ liệu; thiếu schema thì dừng khởi động và chỉ dẫn nâng cấp, không tự migration. Chỉ dùng script kiểm tra/sao lưu/nâng cấp đang có; xem RUNNING.

Retention: giữ từ 00:00 Việt Nam của hôm nay trừ 29 ngày; mốc đúng ranh giới được giữ. Xóa lượt có `started_at` và phiên/dấu thu hồi có `last_seen_at` nhỏ hơn mốc. Dấu thu hồi không đổi `last_seen_at` khi revoke; sau khi hết thời hạn và bị dọn, server không còn nhớ mã cũ. Guest phải xóa mã đang dùng và tạo mã mới sau lần đồng ý mới.

FastAPI lifespan dọn lúc khởi động, sau đó tác vụ trong tiến trình chờ mỗi 00:00 Việt Nam; nếu lỗi thì ghi log và thử lại sau 60 giây. Không có tiến trình API thì lịch không chạy, lần khởi động sau dọn bù. Mỗi worker có thể chạy lịch, các giao dịch SQLite tuần tự hóa việc dọn. Đã kiểm thử startup và vòng lịch với thời gian tiêm vào, không phải quan sát máy chủ vận hành liên tục qua nhiều ngày. Không có cron hoặc dịch vụ scheduler ngoài API.

Guest thật dùng cùng `VITE_API_BASE_URL` với Public (mặc định `/api/v1`), không ghép thêm `/api`. Banner/cài đặt VI/EN; heartbeat mỗi 30 giây chỉ khi visible và online. Rút đồng ý dừng vòng lặp, lưu `ss.analytics.pendingRevoke` trước khi xóa mã, chỉ xóa mã chờ sau 2xx; thử lại khi có mạng/hiển thị/khởi động và mỗi 30 giây. Không cho đồng ý lại trước khi yêu cầu rút xong để không ghi đè mã chờ. localStorage bị chặn thì dừng thống kê và báo; mã chờ chỉ còn trong bộ nhớ có thể mất khi đóng trang. Mock không tạo/gửi thống kê.

## 6. Phần còn chờ triển khai

Upload và phục vụ ảnh cần thiết kế riêng, nằm ngoài phạm vi đợt này. UC09 và UC10–UC11 đã được An đưa lên `main` trong commit `aa0d2d7`, được giữ khi rebase để push; xem mục 9.

Rate limiting chưa triển khai. Không suy từ test tích hợp UC12 sang nghiệm thu đầy đủ dashboard hoặc môi trường vận hành.

Mobile đã nối `createAnalyticsApi` từ commit `48a0908`: style `v1` gọi `/api/v1/analytics/**`, style `contract` gọi alias `/api/analytics/**`. Public của backend hiện tại cần style `v1`; `EXPO_PUBLIC_API_BASE_URL` kết thúc `/api`. `PrivacyProvider` theo dõi AppState/NetInfo; chỉ gửi heartbeat khi foreground và online. AsyncStorage giữ consent/session/pending revoke; rút dừng gửi trước thao tác bất đồng bộ, chặn đồng ý lại khi còn yêu cầu chờ, thử lại mỗi 30 giây và khi lifecycle/network phục hồi. Chế độ mock không tạo mã/gọi mạng/xác nhận revoke, giữ yêu cầu rút thật đến khi trở lại API thật và server xác nhận. Mock adapter trả UNSUPPORTED nếu gọi nhầm, không giả thành công. Test giả lập và HTTP máy cục bộ được phân biệt trong [báo cáo 06/11](testing/integration-2026-11-06.md); chưa nghiệm thu trên điện thoại.

## 7. Xác nhận nhóm còn cần

Phần Public/Admin ở trên ghi nhận mã đã có, không giả định đã có phê duyệt sản phẩm. Nhóm cần review ràng buộc analytics chặt hơn trước khi áp dụng lên database riêng, các đề xuất mục 6 và bộ locale/nội dung được kiểm duyệt. Chưa có xác nhận thành viên nào được thêm vào tài liệu.
## 8. Admin: địa điểm và thuyết minh (UC07–UC08)

Các endpoint dưới đây yêu cầu `Authorization: Bearer <token>`; phiên thiếu, sai, hết hạn hoặc bị thu hồi trả 401 `AUTH_REQUIRED`. Response lỗi dạng `{ "error": { "code": "...", "message": "...", "details": [] } }`. Lỗi 422 không trả dữ liệu đã nhập.

* `GET /api/v1/admin/pois` trả `{ "items": [ ... ] }` gồm mọi trạng thái; `GET /api/v1/admin/pois/{id}` trả một bản ghi hoặc 404 `POI_NOT_FOUND`.
* `POST /api/v1/admin/pois` trả 201 và bản ghi mới `status: "draft"`; `PUT /api/v1/admin/pois/{id}` thay các trường biên tập, giữ trạng thái cũ. Body: `{ "category_id": "id", "name": "Tên", "address": "Địa chỉ", "latitude": 10.7, "longitude": 106.7, "radius_m": 100, "image_url": null, "image_credit": null }`. Tên và địa chỉ bắt buộc, danh mục phải tồn tại, tọa độ lần lượt trong [-90,90] và [-180,180], bán kính nguyên 20–1000; `image_url` tùy chọn là URL HTTP(S) hoặc chính đường dẫn ảnh đã tải lên cho địa điểm này (đường dẫn của địa điểm khác hoặc tự đặt trả 422); `image_credit` ≤ 300 ký tự, khoảng trắng được gộp. Đổi ảnh tải lên sang URL hoặc xóa địa điểm thì tệp ảnh cũ bị xóa. Sai dữ liệu trả 422; danh mục không tồn tại có mã `CATEGORY_NOT_FOUND`.
* `DELETE /api/v1/admin/pois/{id}` trả 204, xóa các thuyết minh liên quan theo khóa ngoại CASCADE; không tồn tại trả 404.
* `GET /api/v1/admin/pois/{id}/narrations` trả `{ "items": [ ... ] }`. `POST` cùng đường dẫn nhận `{ "locale": "vi", "title": "Tiêu đề", "body": "Nội dung" }`, trả 201; mã được trim, chuyển chữ thường và phải nằm trong danh sách `GET /api/v1/locales` (vi, en, fr, zh, ja, ko — sửa tại `backend/app/core/locales.py`), ngoài danh sách trả 422. Mỗi ngôn ngữ chỉ có một bài cho một địa điểm; trùng trả 409 `NARRATION_DUPLICATE`. `PUT /api/v1/admin/pois/{id}/narrations/{narration_id}` nhận `{ "title": "...", "body": "..." }`, giữ nguyên locale và trả bài đã lưu. Thiếu địa điểm hoặc bài trả 404; tiêu đề/nội dung rỗng hoặc sai định dạng trả 422.
* `PUT /api/v1/admin/pois/{id}/image` (09/11): body là nguyên nội dung tệp, `Content-Type` `image/jpeg`, `image/png` hoặc `image/webp`, tối đa 2 MB. Trả 200 kèm địa điểm có `image_url` mới; ảnh cũ đã tải lên bị xóa. Sai loại trả 415 `UNSUPPORTED_IMAGE_TYPE`, quá 2 MB trả 413 `IMAGE_TOO_LARGE`, nội dung không khớp chữ ký tệp trả 422 `INVALID_IMAGE`. `DELETE` cùng đường dẫn bỏ ảnh và `image_credit`, xóa tệp.
* `GET /api/media/pois/{uuid}.{jpg|png|webp}` (công khai): trả tệp với đúng `Content-Type`, `X-Content-Type-Options: nosniff`; tên không hợp lệ hoặc không có tệp trả 404 `MEDIA_NOT_FOUND`. Thư mục lưu: `storage/uploads/` (đổi bằng `SAIGON_UPLOADS`).
* `DELETE /api/v1/admin/pois/{id}/narrations/{narration_id}` trả 204 (09/11). Bài không thuộc địa điểm đó trả 404 `NARRATION_NOT_FOUND`. Nếu địa điểm đang công khai và đây là bài hợp lệ cuối cùng thì trả 409 `NARRATION_REQUIRED`, không xóa (BR03); ẩn địa điểm trước rồi mới xóa được.

Từ 09/11 có upload ảnh (xem trên); vẫn nhận URL ảnh HTTP(S) do quản trị viên nhập. Thay đổi trạng thái công bố từ commit mới của An được ghi ở mục 9. Không thay schema hoặc chạy migration; API công khai giữ nguyên.

## 9. Phần ngày 04/11 của An được giữ khi rebase

Các route sau đã có từ `aa0d2d7`, yêu cầu cùng phiên Admin hợp lệ; không phải chức năng Codex mở rộng từ yêu cầu tồn đọng ngày 03/11.

| Phương thức, đường dẫn | Hành vi |
| --- | --- |
| POST /api/v1/admin/pois/{id}/publish | Draft/hidden thành published sau khi kiểm tra địa điểm và có ít nhất một bài hợp lệ; 200 trả POI; 422 POI_NOT_PUBLISHABLE kèm danh sách mục thiếu |
| POST /api/v1/admin/pois/{id}/hide | Published thành hidden; 200 trả POI; trạng thái chuyển sai trả 409 INVALID_STATUS_TRANSITION |
| GET /api/v1/admin/stats/visits | Không tham số: hôm nay/7 ngày; lọc bằng cặp `date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`, nằm trong cửa sổ 30 ngày; sai trả 422 INVALID_DATE_RANGE |
| GET /api/v1/admin/stats/active | Trả `active_sessions`, `window_seconds:90`, `measured_at`, `note`; chỉ phiên chưa rút có `now-90s < last_seen <= now` |

Visit response gồm `timezone`, `measured_at`, `today`, `last_7_days`, `range` (null hoặc `{from,to,total,days:[{date,visits}]}`), `note`. Backend dùng cùng mốc hiện tại để kiểm tra khoảng lọc và tính thống kê. Admin Dashboard làm mới active 30 giây khi hiển thị, hủy request cũ khi thay bộ lọc/rời màn hình và phân biệt Không khả dụng với 0. Ngày hiển thị theo giờ Việt Nam.

Admin đã có nút công bố/ẩn và xác nhận chỉ công bố nội dung đã kiểm duyệt. Client giữ `error.details` để hiện các trường thiếu. Publish kiểm tra lại dữ liệu cũ bằng validator của POI/bài và thực hiện kiểm tra/chuyển trạng thái trong giao dịch `BEGIN IMMEDIATE`; request đua không cùng công bố một trạng thái. Không thay endpoint, body, response hay schema/migration trong đợt 06/11.

Giữ hàm `run_cleanup_once(database=None)` và cờ `SAIGON_DISABLE_CLEANUP=1` của An. Cờ này tắt cả dọn startup và lịch tự động; mặc định không đặt cờ. Lịch đã ghép thống nhất thành một tác vụ 00:00 Việt Nam, không chạy thêm vòng 6 giờ song song. Khi vận hành chính sách giữ 30 ngày, không bật cờ tắt dọn.
