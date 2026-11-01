# API Contract – Saigon Stories Quận 1 (saigon-api)

| | |
|---|---|
| Phiên bản | **v1.0-đề xuất** – 01/11/2026 (Ngày 1, Milestone 1) |
| Người soạn | Nguyễn Quốc An (phần Public, Analytics, Stats); các phần Admin Auth/CRUD là **đề xuất để Ngô Nguyên xác nhận** |
| Căn cứ | PRD_Saigon_Stories_Quan1_SQLite.docx (30/10/2026): BR01–BR19, NFR01–NFR08, bảng 7.1.1–7.1.7 |
| Trạng thái | Chưa chốt. Chỉ coi là chốt khi cả 3 thành viên xác nhận ở mục 12. Sau khi chốt, mọi thay đổi phải qua Pull Request sửa tệp này. |

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Base URL | `/api` (dev: `http://localhost:8000/api`). guest-web (5173) và admin-web (5174) dùng proxy của Vite nên cùng origin, không cần CORS khi dev. Môi trường công khai: CORS allowlist theo origin của web. |
| Mobile | Điện thoại thật **không** gọi được `localhost`; dùng IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:8000/api`. |
| Định dạng | JSON UTF-8, tên trường `snake_case`. |
| ID | Chuỗi UUID v4 (PK kiểu TEXT). Client coi ID là chuỗi không có ý nghĩa (dữ liệu mock của guest-web đang dùng `poi-1`… vẫn hợp lệ). |
| Thời gian | UTC, ISO 8601 cố định `YYYY-MM-DDTHH:MM:SS.mmmZ`. Ngày thống kê là chuỗi `YYYY-MM-DD` theo `Asia/Ho_Chi_Minh` (BR16). Client **không** gửi mốc thời gian cho thống kê; server dùng giờ máy chủ. |
| Xác thực Admin | Header `Authorization: Bearer <token>`. Token là chuỗi ngẫu nhiên; server chỉ lưu băm vào `admin_sessions.token_hash` (BR10). |
| Không phân trang | Dữ liệu demo nhỏ (≥ 5 địa điểm), các danh sách trả toàn bộ. |
| Ảnh | Tệp tĩnh phục vụ tại `/media/...` (không nằm dưới `/api`). `image_url` là đường dẫn tương đối hoặc `null`. |
| Kiểm tra sức khỏe | `GET /api/health` → `200 {"status":"ok"}`. Không cần xác thực. |

## 2. Quyền truy cập

| Nhóm | Đường dẫn | Ai gọi | Xác thực |
|---|---|---|---|
| Public | `GET /api/public/**`, `GET /media/**` | guest-web, mobile-app | Không |
| Analytics | `POST /api/analytics/heartbeat`, `POST /api/analytics/revoke` | guest-web, mobile-app, chỉ sau khi khách đồng ý | Không (ẩn danh, định danh bằng `session_id`) |
| Admin Auth | `POST /api/admin/auth/login` | admin-web | Không |
| Admin | mọi `/api/admin/**` còn lại | admin-web | **Bắt buộc** Bearer token hợp lệ |

Quy tắc: Public không bao giờ trả địa điểm `draft` hoặc `hidden` (BR01). Backend kiểm tra quyền ở mọi API Admin, không dựa vào giao diện (BR06, BR09). Chỉ có một vai trò quản trị là Admin.

## 3. Định dạng lỗi và mã lỗi

Mọi lỗi (trừ `204`) trả cùng một dạng:

```json
{
  "error": {
    "code": "CATEGORY_IN_USE",
    "message": "Danh mục đang có địa điểm sử dụng, không thể xóa.",
    "details": [ { "field": "category_id", "reason": "..." } ]
  }
}
```

`message` là tiếng Việt, hiển thị thẳng cho người dùng được. `details` chỉ có khi lỗi gắn với trường cụ thể. Client xử lý theo `code`, không theo nội dung `message`.

| HTTP | `code` | Khi nào |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Thiếu hoặc sai token. |
| 401 | `SESSION_EXPIRED` | Token hết hạn hoặc đã đăng xuất (`revoked_at`). Admin-web đưa về trang đăng nhập (UC05-E2). |
| 401 | `INVALID_CREDENTIALS` | Sai tên đăng nhập/mật khẩu, tài khoản bị khóa: **một thông báo chung** (UC05-E1). |
| 403 | `FORBIDDEN` | Có phiên hợp lệ nhưng tài khoản đã bị vô hiệu (`is_active = 0`). |
| 404 | `NOT_FOUND` | Không tồn tại, hoặc địa điểm không Công khai khi gọi từ Public (không phân biệt hai trường hợp). |
| 409 | `CATEGORY_NAME_TAKEN` | Tên danh mục trùng sau chuẩn hóa (BR11). |
| 409 | `CATEGORY_IN_USE` | Xóa danh mục còn địa điểm (BR11). |
| 409 | `INVALID_STATUS_TRANSITION` | Ví dụ ẩn một địa điểm đang `draft` (mục 7.2 PRD). |
| 409 | `SESSION_REVOKED` | Heartbeat của phiên đã rút đồng ý (BR18). |
| 413 | `PAYLOAD_TOO_LARGE` | Ảnh vượt giới hạn. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Ảnh không phải JPG/PNG. |
| 422 | `VALIDATION_ERROR` | Dữ liệu sai: trường trống, tọa độ/bán kính ngoài khoảng, `locale` không hỗ trợ, khoảng ngày sai… Có `details`. |
| 422 | `PUBLISH_REQUIREMENTS_NOT_MET` | Công bố thiếu điều kiện BR04/BR03; `details` liệt kê mục thiếu (UC09-E1). |
| 429 | `RATE_LIMITED` | Quá giới hạn gọi. |
| 500 | `INTERNAL_ERROR` | Lỗi không xác định. Với thống kê, client hiển thị **Không khả dụng**, không hiển thị 0 (BR19). |
| 500 | `IMAGE_SAVE_FAILED` | Lỗi lưu ảnh, dữ liệu địa điểm trước đó giữ nguyên (UC07-E2). |
| 503 | `SERVICE_UNAVAILABLE` | SQLite bị khóa quá thời gian chờ; có header `Retry-After`. |

## 4. Public API (guest-web, mobile-app)

### 4.1 `GET /api/public/categories`
Trả toàn bộ danh mục, sắp theo tên.

```json
[
  { "id": "c1a0f3a2-5d4e-4b7a-9c11-0a1b2c3d4e01", "name": "Di tích và kiến trúc" },
  { "id": "c1a0f3a2-5d4e-4b7a-9c11-0a1b2c3d4e02", "name": "Văn hóa và mua sắm" }
]
```

### 4.2 `GET /api/public/pois?q=&category_id=`
Chỉ địa điểm `published` (BR01). Tham số đều tùy chọn và kết hợp bằng AND (BR02).

| Tham số | Quy tắc |
|---|---|
| `q` | Cắt khoảng trắng hai đầu, chuẩn hóa Unicode NFC, so khớp **chứa**, không phân biệt hoa/thường, trên `name`. Rỗng thì bỏ qua. |
| `category_id` | Lọc đúng danh mục. Không tồn tại thì trả `[]`, không báo lỗi. |

Kết quả rỗng là `200 []` (client hiện thông báo, UC01-E1). Sắp theo `name`. Mỗi phần tử:

```json
{
  "id": "5b2e8d10-7a3c-4f1e-8d62-91c0a7e3b402",
  "category_id": "c1a0f3a2-5d4e-4b7a-9c11-0a1b2c3d4e01",
  "name": "Nhà thờ Đức Bà",
  "address": "01 Công xã Paris, Phường Bến Nghé, Quận 1",
  "latitude": 10.7798,
  "longitude": 106.699,
  "radius_m": 100,
  "image_url": "/media/pois/nha-tho-duc-ba.jpg",
  "narrations": [
    { "locale": "vi", "title": "Nhà thờ Đức Bà", "body": "Nhà thờ Đức Bà được xây dựng trong giai đoạn 1863 đến 1880…" },
    { "locale": "en", "title": "Notre-Dame Cathedral", "body": "Built between 1863 and 1880…" }
  ]
}
```

Quy ước `narrations`: chỉ chứa ngôn ngữ **có nội dung** (BR03); `vi` đứng đầu, các ngôn ngữ còn lại theo thứ tự chữ cái. Danh sách trả luôn kèm `body` để mobile dùng cho tự phát GPS (BR08) mà không phải gọi thêm. `status` và thời gian tạo/sửa không lộ ra Public.

### 4.3 `GET /api/public/pois/{id}`
Cùng cấu trúc phần tử ở 4.2. Không tồn tại, `draft` hoặc `hidden` đều trả `404 NOT_FOUND` (UC02-E2: điểm vừa bị ẩn thì client báo không khả dụng).

## 5. Analytics API (khách đã đồng ý)

Client chỉ gọi các API này sau khi khách bấm Đồng ý (BR13). Khách từ chối hoặc chưa chọn: không sinh `session_id`, không gọi.

### 5.1 `POST /api/analytics/heartbeat`
Gửi mỗi 30 giây khi ứng dụng đang hiển thị và có mạng; dừng khi ẩn hoặc mất mạng (BR15). Web dùng chung một `session_id` cho các tab cùng origin; mobile dùng một mã cho cả ứng dụng.

```json
{ "session_id": "9d7a4c2e-1f3b-4a8e-b5c6-2e8f0a1d3c77" }
```
`200`:
```json
{ "session_id": "9d7a4c2e-1f3b-4a8e-b5c6-2e8f0a1d3c77", "visit_recorded": true, "server_time": "2026-11-03T04:15:00.123Z" }
```
Logic server (một giao dịch `BEGIN IMMEDIATE`, xem `backend/data/schema_analytics.sql`):
1. Chưa có phiên: tạo phiên (`consent_granted = 1`) **và** ghi một lượt (`visit_recorded: true`).
2. Phiên đã rút đồng ý: `409 SESSION_REVOKED`, không ghi gì. Client dừng gửi và xóa mã.
3. Có phiên, đã im lặng **từ 30 phút trở lên** (`last_seen_at <= now − 30 phút`): ghi lượt mới.
4. Còn lại: không ghi lượt. Mọi trường hợp thành công đều cập nhật `last_seen_at = now`.

Lỗi: `422 VALIDATION_ERROR` nếu `session_id` không phải UUID; `429 RATE_LIMITED` nếu quá 10 yêu cầu/phút/phiên (đề xuất).

### 5.2 `POST /api/analytics/revoke`
Rút đồng ý (BR18). Idempotent: gọi lại bao nhiêu lần cũng được; phiên chưa tồn tại vẫn thành công.

```json
{ "session_id": "9d7a4c2e-1f3b-4a8e-b5c6-2e8f0a1d3c77" }
```
`204 No Content`. Server trong một giao dịch: đặt `consent_granted = 0` (tạo dòng nếu chưa có, để heartbeat đến muộn không tạo lại phiên), rồi `UPDATE visit_events SET session_id = NULL`. Số lượt tổng hợp vẫn giữ đến hết 30 ngày.

Client: dừng gửi **ngay** ở mọi tab. Nếu mất mạng hoặc server lỗi thì giữ `session_id` chỉ để gửi lại yêu cầu rút, thử lại khi có mạng và ứng dụng đang mở (UC12-E1). Nhận `204` mới xóa mã.

## 6. Admin – Xác thực *(đề xuất, Ngô Nguyên xác nhận)*

| Phương thức, đường dẫn | Mô tả |
|---|---|
| `POST /api/admin/auth/login` | Body `{ "username": "admin", "password": "…" }`. |
| `POST /api/admin/auth/logout` | Đặt `revoked_at`, token hết dùng ngay. `204`. |
| `GET /api/admin/auth/me` | Kiểm tra phiên cho Auth Guard (UC05 bước 2). |

Đăng nhập thành công `200`:
```json
{ "token": "k3J…(chuỗi ngẫu nhiên)", "token_type": "Bearer", "expires_at": "2026-11-03T12:00:00.000Z", "admin": { "id": "…", "username": "admin" } }
```
`GET .../me` → `200 { "id": "…", "username": "admin" }`. Thời hạn phiên đề xuất: 8 giờ. Lỗi: `401 INVALID_CREDENTIALS`, `403 FORBIDDEN`.

## 7. Admin – Danh mục *(đề xuất)* – UC06

| Phương thức, đường dẫn | Body | Thành công | Lỗi |
|---|---|---|---|
| `GET /api/admin/categories` | – | `200` mảng danh mục | 401 |
| `POST /api/admin/categories` | `{ "name": "…" }` | `201` danh mục | 422, 409 `CATEGORY_NAME_TAKEN` |
| `PUT /api/admin/categories/{id}` | `{ "name": "…" }` | `200` | 404, 422, 409 `CATEGORY_NAME_TAKEN` |
| `DELETE /api/admin/categories/{id}` | – | `204` | 404, 409 `CATEGORY_IN_USE` |

```json
{ "id": "c1a0f3a2-…01", "name": "Di tích và kiến trúc", "poi_count": 3, "created_at": "2026-11-02T03:00:00.000Z", "updated_at": "2026-11-02T03:00:00.000Z" }
```
`name`: 1–100 ký tự sau khi cắt khoảng trắng. Trùng được xét theo `normalized_name` (NFC, không phân biệt hoa/thường).

## 8. Admin – Địa điểm, thuyết minh, công bố *(đề xuất)* – UC07, UC08, UC09

| Phương thức, đường dẫn | Mô tả | Lỗi chính |
|---|---|---|
| `GET /api/admin/pois` | Mọi trạng thái | 401 |
| `POST /api/admin/pois` | Tạo mới, luôn `draft` → `201` | 422 |
| `GET /api/admin/pois/{id}` | Chi tiết | 404 |
| `PUT /api/admin/pois/{id}` | Sửa thông tin (**không** đổi được `status`) | 404, 422 |
| `DELETE /api/admin/pois/{id}` | Xóa kèm bài thuyết minh (CASCADE) → `204`. Hộp thoại xác nhận do giao diện đảm nhiệm. | 404 |
| `POST /api/admin/pois/{id}/image` | `multipart/form-data`, trường `file` (JPG/PNG, ≤ 5 MB) → `200 { "image_url": "…" }` | 413, 415, 500 `IMAGE_SAVE_FAILED` |
| `GET /api/admin/pois/{id}/narrations` | Danh sách bài của địa điểm | 404 |
| `PUT /api/admin/pois/{id}/narrations/{locale}` | Tạo hoặc cập nhật bài theo `(poi_id, locale)` → `201` nếu tạo, `200` nếu sửa | 404, 422 |
| `POST /api/admin/pois/{id}/publish` | `draft`/`hidden` → `published`; đã `published` thì `200` không đổi | 404, 422 `PUBLISH_REQUIREMENTS_NOT_MET` |
| `POST /api/admin/pois/{id}/hide` | `published` → `hidden`; đã `hidden` thì `200` không đổi | 404, 409 `INVALID_STATUS_TRANSITION` |

Body `POST`/`PUT` địa điểm (BR04):
```json
{ "category_id": "c1a0f3a2-…01", "name": "Chợ Bến Thành", "address": "Đường Lê Lợi, Phường Bến Thành, Quận 1", "latitude": 10.7725, "longitude": 106.698, "radius_m": 120 }
```
`name` ≤ 200 ký tự, `address` ≤ 300 ký tự, không rỗng; `latitude` −90…90; `longitude` −180…180; `radius_m` nguyên 20…1000, mặc định 100; `category_id` phải tồn tại. Phản hồi Admin có thêm `status`, `narration_locales` (ví dụ `["vi","en"]`), `created_at`, `updated_at`.

Body bài thuyết minh: `{ "title": "…", "body": "…" }`; `title` ≤ 200, `body` ≤ 10 000 ký tự, không rỗng. `locale` trong đường dẫn thuộc danh sách hỗ trợ, hiện đề xuất `vi`, `en` (số ngôn ngữ thêm cần xác nhận với giảng viên, PRD mục 5.6); ngoài danh sách thì `422` với `details.field = "locale"`.

Công bố thiếu điều kiện (`422`):
```json
{ "error": { "code": "PUBLISH_REQUIREMENTS_NOT_MET", "message": "Chưa đủ điều kiện công bố.",
  "details": [ { "field": "narrations", "reason": "Cần ít nhất một bài thuyết minh hợp lệ." } ] } }
```
Địa điểm đang `published`: sửa hợp lệ có hiệu lực ngay sau khi lưu (BR12).

## 9. Admin – Thống kê (UC10, UC11)

### 9.1 `GET /api/admin/stats/visits?from=YYYY-MM-DD&to=YYYY-MM-DD`
`from` và `to` phải đi cùng nhau hoặc cùng vắng. Khi có, phải thỏa `hôm_nay − 29 ≤ from ≤ to ≤ hôm_nay` (giờ VN, tính cả hai đầu, BR16); sai thì `422 VALIDATION_ERROR` kèm giới hạn trong `message` (UC10-E1).

```json
{
  "timezone": "Asia/Ho_Chi_Minh",
  "generated_at": "2026-11-03T04:15:00.123Z",
  "today": { "date": "2026-11-03", "visits": 12 },
  "last_7_days": { "from": "2026-10-28", "to": "2026-11-03", "visits": 85 },
  "range": {
    "from": "2026-10-30", "to": "2026-11-02", "total": 31,
    "days": [
      { "date": "2026-10-30", "visits": 9 }, { "date": "2026-10-31", "visits": 0 },
      { "date": "2026-11-01", "visits": 14 }, { "date": "2026-11-02", "visits": 8 }
    ]
  }
}
```
`last_7_days` gồm hôm nay và 6 ngày trước. `range` chỉ có khi truyền `from`/`to`, và `days` liệt kê **đủ từng ngày, ngày không có lượt là `0`** (UC10-A1). Không có dữ liệu hợp lệ là `200` với số `0`; lỗi truy vấn là `5xx` để client hiện **Không khả dụng** + nút Thử lại, tuyệt đối không đổi lỗi thành `0` (BR19). Client hiển thị kèm `generated_at`.

### 9.2 `GET /api/admin/stats/active`
```json
{ "active_sessions": 3, "window_seconds": 90, "measured_at": "2026-11-03T04:15:00.123Z", "is_estimate": true }
```
Đếm số `session_id` khác nhau có `consent_granted = 1` và `now − 90 giây < last_seen_at ≤ now` (BR17). Không phụ thuộc bộ lọc ngày. Admin-web tự gọi lại mỗi 30 giây khi trang đang hiển thị, và ghi chú đây là **ước lượng, không phải số người duy nhất** (BR19).

## 10. Dữ liệu mẫu (seed, NFR05)

Chỉ để cả nhóm dùng chung dữ liệu khi dựng giao diện. Nguyên là người chốt bộ seed chuẩn (WBS-02).

| Địa điểm | Danh mục | Ngôn ngữ | Tọa độ (ước lượng, cần kiểm tra lại) | Bán kính |
|---|---|---|---|---|
| Dinh Độc Lập | Di tích và kiến trúc | vi | 10.7770, 106.6953 | 150 |
| Nhà thờ Đức Bà | Di tích và kiến trúc | vi, en | 10.7798, 106.6990 | 100 |
| Bưu điện Trung tâm | Di tích và kiến trúc | vi | 10.7799, 106.6998 | 80 |
| Chợ Bến Thành | Văn hóa và mua sắm | vi | 10.7725, 106.6980 | 120 |
| Nhà hát Thành phố | Văn hóa và mua sắm | vi | 10.7766, 106.7032 | 90 |

Tài khoản Admin demo: tên đăng nhập `admin`; **mật khẩu không ghi trong tài liệu** (BR10, NFR01), do Nguyên cung cấp qua README hoặc biến môi trường.

## 11. Ghi chú triển khai cho backend (SQLite)

- Mỗi kết nối: `PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`. Hết thời gian chờ thì trả `503 SERVICE_UNAVAILABLE`.
- Heartbeat và revoke dùng `BEGIN IMMEDIATE` để hai yêu cầu đồng thời không ghi trùng lượt (BR15).
- **Tìm kiếm tiếng Việt:** `LOWER()` và `LIKE` của SQLite chỉ xử lý chữ ASCII, nên `q = "đức"` sẽ không khớp "Đức" nếu chỉ dùng SQL. Lọc `name` ở Python sau khi `unicodedata.normalize('NFC', …).casefold()`, hoặc thêm cột tên đã chuẩn hóa. Việc này ảnh hưởng trực tiếp kết quả BR02.
- Thời gian lưu đúng định dạng cố định ở mục 1 để so sánh chuỗi chính xác. Đổi ngày VN bằng `date(started_at, '+7 hours')`; đổi mốc 00:00 VN sang UTC trước khi truy vấn để dùng được chỉ mục `started_at`.
- Dọn dữ liệu mỗi ngày: xóa `visit_events` có `started_at` trước 00:00 giờ VN của `hôm_nay − 29`, đúng với khoảng lọc tối đa 30 ngày.
- Chưa có cơ chế giới hạn tốc độ nào ghi trong PRD. Ngưỡng 10 yêu cầu/phút/phiên ở mục 5.1 là đề xuất.

## 12. Cần nhóm xác nhận

| # | Nội dung | Người xác nhận |
|---|---|---|
| 1 | Toàn bộ mục 4–5 và 9 (phần của An) | Ngô Nguyên (review API), Lê Nam Thuận (dùng ở mobile) |
| 2 | Mục 6–8: đường dẫn Admin, TTL phiên 8 giờ, giới hạn độ dài, giới hạn ảnh 5 MB | Ngô Nguyên |
| 3 | `GET /public/pois` luôn kèm `body` thuyết minh | Lê Nam Thuận, Ngô Nguyên |
| 4 | Danh sách `locale` hỗ trợ (`vi`, `en`) | Cả nhóm, hỏi giảng viên |
| 5 | Mã lỗi và định dạng lỗi ở mục 3 | Cả nhóm |

| Thành viên | Xác nhận | Ngày |
|---|---|---|
| Ngô Nguyên | | |
| Nguyễn Quốc An | | |
| Lê Nam Thuận | | |
