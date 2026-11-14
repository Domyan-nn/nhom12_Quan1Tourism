# Hướng dẫn nắm backend, API và CI để báo cáo và vấn đáp

Viết ngày 11/11/2026 theo mã `main` `1c03f06`. Dành cho người điều phối dự án cần **tự giải thích và tự sửa được** backend, API và CI trước buổi bảo vệ.

Nguyên tắc xuyên suốt: **không trình bày điều gì bạn chưa tự chạy, tự đọc và tự nói lại được bằng lời của mình.** Giảng viên hỏi "tại sao", không hỏi "ở đâu".

## 0. Lộ trình 4 buổi

| Buổi | Thời lượng | Mục tiêu | Xong khi bạn làm được |
| --- | --- | --- | --- |
| 1 | 1,5 giờ | Chạy và quan sát | Tự bật API trên bản sao DB, gọi 5 endpoint trong Swagger, đọc mã lỗi |
| 2 | 3 giờ | Lần theo 4 luồng request | Vẽ tay luồng từ client đến SQLite cho 4 luồng ở mục 3, không nhìn tài liệu |
| 3 | 1,5 giờ | Database và migration | Giải thích 8 bảng, ràng buộc, `user_version`, vì sao API không tự migration |
| 4 | 2 giờ | Test và CI | Tự viết 1 test, cố ý làm hỏng code để thấy test và CI đỏ, rồi sửa lại |

Sau đó: tự trả lời bộ câu hỏi ở mục 7 thành tiếng, mỗi câu dưới 1 phút.

---

## 1. Bức tranh tổng thể

```
 Guest web (5173)   Admin web (5174)   Mobile (Expo)
        │  Vite proxy /api  │               │ HTTP LAN :8000
        └─────────┬─────────┘───────────────┘
                  ▼
      FastAPI  backend/app/main.py  (uvicorn :8000)
        │ 1. Router chọn hàm theo URL         api/routes/*.py
        │ 2. Dependency: mở kết nối DB        api/dependencies.py  get_db
        │    và kiểm phiên Admin nếu cần                            require_admin
        │ 3. Kiểm dữ liệu vào (Pydantic)      schemas/*.py, class trong route
        │ 4. Quy tắc nghiệp vụ                services/*.py
        │ 5. Câu SQL                          db/*_repository.py
        ▼
      SQLite  backend/data/saigon_stories.db  (1 tệp, schema bản 5)
      Ảnh tải lên  storage/uploads/pois/
```

Ba ý cần nói được ngay:

1. **Một backend chung cho ba client.** Web khách, Admin và mobile đều gọi cùng một API. Hai web gọi `/api/...` qua proxy của Vite ([guest-web/vite.config.js](../../apps/guest-web/vite.config.js), [admin-web/vite.config.js](../../apps/admin-web/vite.config.js)), nên trình duyệt không gặp lỗi CORS.
2. **Kiến trúc phân lớp:** route (nhận HTTP) → service (quy tắc) → repository (SQL). Không dùng ORM, viết SQL tay với `sqlite3`.
3. **Mỗi request một kết nối SQLite riêng**, mở trong `get_db` và đóng khi trả lời xong.

### Bản đồ thư mục backend

| Thư mục | Vai trò | Tệp nên đọc trước |
| --- | --- | --- |
| `app/main.py` | Tạo app, gắn router, xử lý lỗi chung, kiểm schema khi khởi động | [main.py](../../backend/app/main.py) |
| `app/api/routes/` | Mỗi tệp một nhóm endpoint | [public.py](../../backend/app/api/routes/public.py), [auth.py](../../backend/app/api/routes/auth.py) |
| `app/api/dependencies.py` | Kết nối DB theo request, kiểm token Admin | [dependencies.py](../../backend/app/api/dependencies.py) |
| `app/services/` | Quy tắc nghiệp vụ: đăng nhập, thống kê, ảnh | [auth.py](../../backend/app/services/auth.py), [analytics_service.py](../../backend/app/services/analytics_service.py) |
| `app/db/` | Kết nối và câu SQL | [connection.py](../../backend/app/db/connection.py), [poi_repository.py](../../backend/app/db/poi_repository.py) |
| `app/core/` | Tiện ích: băm mật khẩu, bỏ dấu, ngôn ngữ | [security.py](../../backend/app/core/security.py), [text.py](../../backend/app/core/text.py) |
| `migrations/` | Tệp SQL tạo và nâng cấp schema, đánh số 001–004 | [001_initial.sql](../../backend/migrations/001_initial.sql) |
| `scripts/` | Lệnh vận hành: tạo DB, seed, sao lưu, migration | [backup_db.py](../../backend/scripts/backup_db.py) |
| `tests/` | 15 tệp test, chạy bằng `unittest` | [test_public_api.py](../../backend/tests/test_public_api.py) |

Thư viện: chỉ `fastapi`, `uvicorn`, `tzdata` ([requirements.txt](../../backend/requirements.txt)); test thêm `httpx`, `pytest`.

---

## 2. Buổi 1 — Chạy và quan sát

Luôn chạy trên **bản sao** DB, không đụng DB chính. Mở PowerShell ở gốc repo:

```powershell
$db = "$env:TEMP\saigon-hoc.db"
.\.venv\Scripts\python.exe backend/scripts/backup_db.py --database backend/data/saigon_stories.db --destination $db
$env:SAIGON_DATABASE = $db
$env:SAIGON_DISABLE_CLEANUP = "1"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8001
```

Lệnh sao lưu từ chối ghi đè; chạy lại thì xóa `$db` cũ trước. Biến `SAIGON_DISABLE_CLEANUP=1` tắt việc dọn thống kê cũ để dữ liệu không đổi khi bạn đang học.

Từ commit `99e3d88` (phần mở rộng C), API đòi DB **schema 5**. Nếu uvicorn dừng ngay với lỗi "chưa có migration 005" (DB chính chưa migrate, hoặc bản sao tạo trước ngày 13/11), nâng cấp **bản sao** rồi bật lại:

```powershell
.\.venv\Scripts\python.exe backend/scripts/migrate_005_admin_audit_log.py --database $db --backup "$env:TEMP\saigon-hoc-truoc-005.db"
```

Mở **http://127.0.0.1:8001/docs**. Đây là Swagger UI do FastAPI tự sinh từ code. Làm lần lượt và ghi kết quả:

| # | Thao tác | Kết quả mong đợi | Hỏi chính mình |
| --- | --- | --- | --- |
| 1 | `GET /api/v1/health` | `{"status":"ok"}` | Vì sao health không kiểm DB? (đọc docstring ở [main.py:101](../../backend/app/main.py#L101)) |
| 2 | `GET /api/v1/pois`, rồi thêm `q=ben thanh` | 5 địa điểm; tìm không dấu vẫn ra Chợ Bến Thành | Bỏ dấu ở đâu? ([text.py](../../backend/app/core/text.py)) |
| 3 | `GET /api/v1/pois/khong-co` | 404, `POI_NOT_FOUND` | Vì sao nháp/ẩn cũng trả 404 thay vì 403? |
| 4 | `GET /api/v1/admin/me` không có token | 401, `AUTH_REQUIRED` | Ai chặn? (`require_admin`) |
| 5 | `POST /api/v1/admin/login` bằng tài khoản Admin, bấm **Authorize** dán `access_token`, gọi lại `/admin/me` | 200 | Token lưu ở DB dưới dạng gì? |
| 6 | Đăng nhập sai 5 lần liên tiếp | Lần 6 trả 429 kèm `Retry-After` | Đếm theo gì, lưu ở đâu? |

Dừng API bằng `Ctrl+C`. Bài về nhà: mở [API_CONTRACT.md](../API_CONTRACT.md) và so 6 kết quả trên với hợp đồng.

---

## 3. Buổi 2 — Lần theo 4 luồng request

Với mỗi luồng: mở các tệp theo đúng thứ tự, đọc, rồi **gập máy lại và nói lại** bằng lời.

### Luồng A — Khách xem danh sách địa điểm (UC01, BR01, BR02)

1. [public.py](../../backend/app/api/routes/public.py): `GET /api/v1/pois` nhận `q` và `category_id`, xin kết nối qua `Depends(get_db)`.
2. [dependencies.py:15](../../backend/app/api/dependencies.py#L15) `get_db`: mở kết nối, `yield` cho route dùng, `finally` đóng lại.
3. [connection.py:79](../../backend/app/db/connection.py#L79) `connect`: mở tệp có sẵn (`mode=rw`, không tự tạo), **bật `foreign_keys`** vì SQLite mặc định tắt, chờ khóa tối đa 10 giây.
4. [poi_repository.py:8](../../backend/app/db/poi_repository.py#L8) `list_pois`: SQL luôn có `WHERE status = 'published'` → **BR01: khách không bao giờ thấy nháp/ẩn**. Tham số truyền bằng `?`, không ghép chuỗi → chống SQL injection. Tìm theo tên làm bằng Python sau khi bỏ dấu.

Câu nên nói: *"Quy tắc chỉ hiện địa điểm công khai nằm ngay trong câu SQL của repository công khai, nên không route nào của khách có thể lỡ trả về bản nháp."*

### Luồng B — Admin đăng nhập và dùng phiên (UC05, BR09, BR10, NFR01)

1. [routes/auth.py](../../backend/app/api/routes/auth.py) `POST /login` gọi `auth.login`; sai trả 401, bị khóa tạm trả 429.
2. [services/auth.py:32](../../backend/app/services/auth.py#L32) `login`:
   - chuẩn hóa tên đăng nhập, hỏi bộ đếm [login_throttle.py](../../backend/app/services/login_throttle.py) (5 lần sai trong 15 phút);
   - tên không tồn tại vẫn chạy băm mật khẩu "giả" (`consume_password_work`) để thời gian trả lời giống nhau → kẻ tấn công không đoán được tài khoản nào có thật;
   - đúng thì sinh token ngẫu nhiên, **chỉ lưu bản băm SHA-256 của token** vào `admin_sessions`, hạn 8 giờ.
3. [security.py:17](../../backend/app/core/security.py#L17): mật khẩu băm **PBKDF2-SHA256, 600.000 vòng, salt 16 byte**, so sánh bằng `hmac.compare_digest` (chống đo thời gian).
4. Mọi request Admin sau đó: [dependencies.py:23](../../backend/app/api/dependencies.py#L23) `require_admin` đọc header `Authorization: Bearer <token>`, băm lại, tìm phiên còn hạn, chưa thu hồi. Không có thì 401.
5. Các router Admin gắn `dependencies=[Depends(require_admin)]` ngay khi khai báo (ví dụ đầu [admin_pois.py](../../backend/app/api/routes/admin_pois.py)) → không thể quên kiểm quyền ở từng endpoint.

Câu nên nói: *"Lộ database thì kẻ tấn công cũng không dùng được token, vì DB chỉ giữ bản băm."*

### Luồng C — Admin công bố địa điểm (UC09, BR03, BR04)

1. `POST /api/v1/admin/pois/{id}/publish` → [admin_pois.py:273](../../backend/app/api/routes/admin_pois.py#L273) `change_status(db, id, ("draft","hidden"), "published")`.
2. `BEGIN IMMEDIATE`: khóa ghi ngay từ đầu, để hai Admin bấm cùng lúc không chen nhau.
3. Kiểm **máy trạng thái**: chỉ nháp/ẩn → công khai; công khai → ẩn. Sai thì 409 `INVALID_STATUS_TRANSITION`.
4. [admin_pois.py:242](../../backend/app/api/routes/admin_pois.py#L242) `publish_problems`: kiểm lại tên, địa chỉ, danh mục, tọa độ, bán kính và **ít nhất một bài thuyết minh hợp lệ**. Thiếu thì 422 `POI_NOT_PUBLISHABLE` kèm danh sách mục thiếu.

Vẽ được sơ đồ: `draft ──publish──▶ published ──hide──▶ hidden ──publish──▶ published`.

### Luồng D — Thống kê ẩn danh theo đồng ý (UC10–UC12, BR13–BR18)

1. Khách bấm Đồng ý → client tự sinh UUID ngẫu nhiên, gửi `POST /api/v1/analytics/heartbeat` mỗi 30 giây khi trang đang hiển thị. **Không có tên, số điện thoại, tọa độ.**
2. [analytics_service.py:73](../../backend/app/services/analytics_service.py#L73) `record_heartbeat`:
   - phiên mới → tạo phiên và 1 lượt truy cập;
   - cách lần trước ≥ 30 phút → thêm lượt mới (BR14);
   - phiên đã rút → trả 409, không kích hoạt lại.
3. [analytics_service.py:117](../../backend/app/services/analytics_service.py#L117) `revoke_session` (BR18): tách UUID khỏi các lượt cũ (số lượt theo ngày vẫn đúng), đặt `consent_granted = 0`. Gọi lặp lại vẫn thành công (idempotent). Nếu UUID chưa từng có thì tạo "bia mộ" để heartbeat đến muộn không tạo lại phiên.
4. [analytics_service.py:145](../../backend/app/services/analytics_service.py#L145): "đang hoạt động" = phiên chưa rút, có tín hiệu trong 90 giây (BR17).
5. [analytics_service.py:164](../../backend/app/services/analytics_service.py#L164) + [analytics_retention.py](../../backend/app/services/analytics_retention.py): xóa dữ liệu quá 30 ngày lúc khởi động và mỗi 00:00 giờ Việt Nam.

Câu nên nói: *"Số đang hoạt động là ước lượng: khách đóng tab thì phải đợi tối đa 90 giây mới hết được tính."*

### Luồng phụ — Upload ảnh (phần mở rộng A)

[admin_pois.py:145](../../backend/app/api/routes/admin_pois.py#L145) và [services/media.py](../../backend/app/services/media.py): kiểm `Content-Type`, đọc từng khúc và dừng ngay khi vượt 2 MB, **kiểm chữ ký tệp** (byte đầu của JPG/PNG/WebP) để chống đổi đuôi. Tên tệp là UUID mới, ghi kiểu "tạo mới, cấm ghi đè". `path_for` từ chối mọi đường dẫn có `../`. Ảnh cũ bị xóa khi thay ảnh.

### Xử lý lỗi chung

[main.py:77](../../backend/app/main.py#L77): mọi lỗi trả cùng một dạng `{"error": {"code", "message", "details"}}`. Client dựa vào `code`, không dựa vào câu chữ. Lỗi dữ liệu vào (422) cố ý **không lặp lại body**, để mật khẩu không bao giờ xuất hiện trong phản hồi lỗi.

---

## 4. Buổi 3 — Database và migration

### 8 bảng

| Bảng | Lưu gì | Ràng buộc đáng nói |
| --- | --- | --- |
| `admin_accounts` | Tài khoản Admin | `username` UNIQUE, chỉ lưu băm mật khẩu |
| `admin_sessions` | Phiên đăng nhập | `token_hash` UNIQUE, `expires_at > issued_at`, xóa Admin thì xóa phiên (`CASCADE`) |
| `categories` | Danh mục VI/EN | `normalized_name` UNIQUE → chặn trùng tên khác hoa/thường |
| `pois` | Địa điểm | Tọa độ trong miền hợp lệ, bán kính 20–1000, `status` chỉ 3 giá trị, xóa danh mục đang dùng bị chặn (`RESTRICT`) |
| `poi_narrations` | Bài thuyết minh | `UNIQUE (poi_id, locale)` → mỗi ngôn ngữ một bài |
| `anonymous_sessions` | Phiên thống kê ẩn danh | UUID v4 kiểm bằng CHECK, thời gian định dạng cố định |
| `visit_events` | Lượt truy cập | Rút đồng ý thì `session_id` thành NULL (`SET NULL`) |
| `admin_audit_log` | Nhật ký thao tác Admin (migration 005) | `admin_id` `RESTRICT`: tài khoản đã có nhật ký không xóa được, chỉ khóa |

Xem [001_initial.sql](../../backend/migrations/001_initial.sql) và [data-dictionary.md](../analysis-design/data-dictionary.md).

**Vì sao ràng buộc đặt ở cả DB lẫn API?** API (Pydantic) báo lỗi thân thiện cho người dùng; DB là lớp bảo vệ cuối, kể cả khi ai đó sửa dữ liệu bằng script.

### Migration và `user_version`

- `PRAGMA user_version` là số phiên bản schema ghi ngay trong tệp SQLite. Hiện là **5**.
- 001 tạo bảng → 002 siết ràng buộc thống kê → 003 thêm tên danh mục tiếng Anh → 004 thêm `pois.image_credit` → 005 thêm bảng `admin_audit_log`. Xem [migrations/README.md](../../backend/migrations/README.md).
- Khi khởi động, [connection.py:57](../../backend/app/db/connection.py#L57) **từ chối chạy** nếu DB cũ hơn bản 5 (thiếu `pois.image_credit` hoặc bảng `admin_audit_log`), và **không bao giờ tự migration**. Lý do: tự nâng cấp DB đang chứa dữ liệu thật mà không sao lưu là rủi ro mất dữ liệu. Nâng cấp phải chạy script có `--check` (chỉ xem) và `--backup` (bắt buộc sao lưu).

Bài tập: chạy `--check` của migration 005 trên bản sao ở buổi 1. Script dừng với thông báo `Migration 005 already applied (user_version = 5)` và mã thoát 1, không ghi gì. Giải thích vì sao từ chối chạy lại lại là hành vi đúng:

```powershell
.\.venv\Scripts\python.exe backend/scripts/migrate_004_poi_image_credit.py --database "$env:TEMP\saigon-hoc.db" --check
```

### Sao lưu

[backup_db.py](../../backend/scripts/backup_db.py) dùng **SQLite Backup API**, không copy tệp thô, nên bản sao luôn nhất quán kể cả khi đang có ghi. Sau khi chép thì kiểm `integrity_check` và `foreign_key_check`. Ảnh tải lên nằm ngoài DB nên phải chép thêm `storage/uploads/`.

---

## 5. Buổi 4 — Test và CI

### Cách một test backend hoạt động

Mở [test_admin_api.py](../../backend/tests/test_admin_api.py), hàm `setUp`:

1. Tạo **DB tạm** trong thư mục tạm, chạy `init_db.py` và `seed`.
2. `app.dependency_overrides[get_db] = test_db`: thay kết nối thật bằng kết nối tới DB tạm. **Test không bao giờ chạm DB chính.**
3. `TestClient(app)` gọi API như một client thật nhưng không cần bật server.
4. `addCleanup`: dọn DB tạm và bộ đếm đăng nhập sai sau mỗi test.

Chạy một tệp test:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p "test_public_api.py" -v
```

Chạy tất cả (113 test, khoảng 1 phút):

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests
```

### Bài tập "làm hỏng có chủ đích" (quan trọng nhất)

Làm trên nhánh nháp, **không commit**:

1. Trong [poi_repository.py:9](../../backend/app/db/poi_repository.py#L9) (`list_pois`), đổi `WHERE status = 'published'` thành `WHERE 1 = 1`, tức là bỏ lọc trạng thái.
2. Chạy lại `test_public_api.py` → cả 2 test đỏ (`FAILED (failures=2)`, đã thử 11/11). Đọc thông báo lỗi: dòng `assert` nào bắt được, vì sao.
3. Hoàn tác bằng `git checkout -- backend/app/db/poi_repository.py`, chạy lại → xanh.

Làm tương tự với: đổi `MAX_FAILURES = 5` thành `50` trong [login_throttle.py](../../backend/app/services/login_throttle.py); bỏ dòng `PRAGMA foreign_keys = ON` trong [connection.py](../../backend/app/db/connection.py). Mỗi lần, ghi lại test nào đỏ. Đây chính là câu trả lời cho câu hỏi "Làm sao biết test của em có ý nghĩa?".

### Bài tập tự viết

Tự viết một test mới trong `test_public_api.py`: gọi `GET /api/v1/locales` và kiểm có `vi` và `en`. Tự viết, chạy cho xanh, rồi mới nhờ AI nhận xét. Đừng nhờ AI viết.

### CI — GitHub Actions

Tệp [.github/workflows/ci.yml](../../.github/workflows/ci.yml). Chạy mỗi lần push lên bất kỳ nhánh nào, hoặc khi bấm chạy tay.

| Job | Máy | Làm gì |
| --- | --- | --- |
| `backend` | Ubuntu | Cài Python 3.12, chạy toàn bộ `unittest` |
| `guest-web` | Ubuntu | `npm ci`, Node test + Vitest, build |
| `admin-web` | Ubuntu | `npm ci`, build |
| `mobile` | Ubuntu | `npm ci`, Jest |
| `e2e` | Windows | Chỉ chạy khi 3 job đầu xanh (`needs`); Playwright trên Edge với 4 dịch vụ và DB tạm; lỗi thì lưu ảnh chụp 7 ngày |

Từ khóa cần giải thích được:

- `npm ci` (không phải `npm install`): cài **đúng** phiên bản trong `package-lock.json` → CI tái lập được.
- `cache`: lưu gói pip/npm giữa các lần chạy cho nhanh.
- `concurrency ... cancel-in-progress`: push liên tiếp thì hủy lượt cũ, chỉ chạy commit mới nhất.
- `permissions: contents: read`: CI chỉ được đọc repo, nguyên tắc quyền tối thiểu.

Xem lịch sử chạy ở tab **Actions** trên GitHub. Bài tập: đẩy nhánh có test hỏng ở trên lên GitHub, xem job `backend` đỏ, mở log tìm dòng lỗi, rồi xóa nhánh.

### "CD" — nói thật

Dự án **có CI, chưa có CD** (triển khai tự động). Không có server công khai; demo chạy trên LAN bằng `scripts/start-system.ps1`. Phần mở rộng G (chạy bản build bằng một lệnh) là bước gần nhất tới triển khai. Nếu được hỏi, trả lời: *"Nhóm dừng ở CI vì phạm vi là demo trên mạng nội bộ; bước tiếp theo sẽ là build Docker image và triển khai lên một VPS có HTTPS khi CI xanh trên main."* Đừng nói là đã có CD.

---

## 6. Quy trình Git nhóm đang dùng

Theo [CONTRIBUTING.md](../../CONTRIBUTING.md): mỗi việc một nhánh (`feat/`, `fix/`, `docs/`), mở PR vào `main`, CI xanh và một người khác duyệt mới merge.

Nói trung thực về thực tế: phần A commit thẳng lên `main`; PR #4 merge khi chưa có review. Branch protection chưa bật. Nên bật trước buổi bảo vệ (Settings → Branches → Add rule cho `main`: Require a pull request, Require status checks `backend`, `guest-web`, `admin-web`, `mobile`) để nói được *"từ ngày X, main được bảo vệ"*.

---

## 7. Câu hỏi vấn đáp thường gặp và ý trả lời

Đọc ý, rồi **tự nói bằng lời của mình**. Đừng học thuộc.

**Kiến trúc**

1. *Vì sao chọn FastAPI và SQLite?* FastAPI: nhẹ, tự sinh tài liệu `/docs`, kiểm dữ liệu bằng Pydantic. SQLite: một tệp, không cần cài máy chủ DB, đủ cho một Admin và lượng khách demo, dễ sao lưu. Giới hạn: một tiến trình ghi tại một thời điểm, không hợp tải lớn.
2. *Vì sao không dùng ORM?* Schema nhỏ (8 bảng). SQL tay giúp thấy rõ câu lệnh, kiểm soát giao dịch `BEGIN IMMEDIATE`. Đánh đổi: phải tự viết câu SQL lặp lại.
3. *Các lớp trong backend?* Route → service → repository → SQLite (mục 1). Điểm yếu tự nhận: phần địa điểm còn viết SQL ngay trong route `admin_pois.py`, chưa tách sang service như danh mục.
4. *Ba client dùng chung API thế nào?* Cùng tiền tố `/api/v1`; web qua proxy Vite, mobile gọi thẳng IP LAN.

**Bảo mật**

5. *Lưu mật khẩu thế nào?* PBKDF2-SHA256, 600.000 vòng, salt ngẫu nhiên 16 byte. Không lưu mật khẩu gốc.
6. *Phiên đăng nhập?* Token ngẫu nhiên 32 byte, DB chỉ lưu SHA-256 của token, hạn 8 giờ, đăng xuất thì thu hồi.
7. *Chống dò mật khẩu?* 5 lần sai trong 15 phút thì khóa tạm, trả 429 kèm `Retry-After`. Đếm theo tên đăng nhập vì mọi request qua proxy đều đến từ 127.0.0.1. Giới hạn: bộ đếm nằm trong bộ nhớ, khởi động lại API thì về 0.
8. *Chống SQL injection?* Mọi câu SQL dùng tham số `?`.
9. *Làm sao khách không thấy bản nháp?* SQL công khai luôn lọc `status = 'published'`; chi tiết nháp/ẩn trả 404 giống như không tồn tại, để không lộ là có bản nháp.
10. *HTTPS?* Chưa có, vì demo trên LAN. Đây là giới hạn đã ghi ở NFR01.

**Dữ liệu và nghiệp vụ**

11. *Quyền riêng tư của thống kê?* Chỉ thu khi khách đồng ý; chỉ UUID ngẫu nhiên và thời điểm; không tên, không tọa độ; rút đồng ý thì tách UUID khỏi các lượt; tự xóa sau 30 ngày.
12. *"Đang hoạt động" tính sao, chính xác không?* Phiên chưa rút có tín hiệu trong 90 giây; là ước lượng, có độ trễ tối đa 90 giây.
13. *Hai Admin công bố cùng lúc?* `BEGIN IMMEDIATE` khóa ghi, thao tác thứ hai chờ rồi kiểm lại trạng thái.
14. *Vì sao API không tự migration?* Tránh nâng cấp DB thật mà chưa sao lưu; API chỉ kiểm `user_version` và dừng với hướng dẫn rõ.
15. *Upload ảnh an toàn thế nào?* Giới hạn 2 MB, chỉ JPG/PNG/WebP, kiểm cả header lẫn chữ ký tệp, tên tệp UUID, chặn `../`.

**Kiểm thử và CI**

16. *Test bao nhiêu, loại gì?* Backend 113 (unittest + TestClient, DB tạm); guest 40 Node + 20 Vitest; mobile 134 Jest; Playwright khoảng 41 ca đầu-cuối. Lấy số mới nhất từ lượt chạy cuối trước khi bảo vệ.
17. *Test có đụng DB thật không?* Không: mỗi test tạo DB tạm và thay dependency `get_db`.
18. *Làm sao biết test có ý nghĩa?* Kể lại bài tập "làm hỏng có chủ đích" ở mục 5.
19. *CI chạy gì, khi nào? Có CD không?* Mục 5: 5 job mỗi lần push; chưa có CD.
20. *Truy vết yêu cầu → test?* [traceability-matrix.md](../testing/traceability-matrix.md): F/BR/NFR → UC → API → mã → ca kiểm thử.

**Câu hỏi về bản thân**

21. *Em làm phần nào?* Nói đúng vai: tích hợp, điều phối, phần A và G, CI. Nếu có dùng AI, nói thẳng: *"Em dùng AI hỗ trợ viết code, nhưng em đã đọc, chạy test và tự sửa từng phần"*, rồi chứng minh bằng cách mở code và giải thích ngay. Che giấu rủi ro hơn nói thật.
22. *Nếu thêm tính năng X thì sửa ở đâu?* Luyện với "thêm trường số điện thoại liên hệ cho địa điểm": migration 005 → cột mới → `PlaceInput` → SQL ở repository và route → API_CONTRACT → test → form Admin.

---

## 8. Điểm yếu nên chủ động nêu

Tự nêu trước thì được đánh giá là hiểu hệ thống. Bị hỏi ra thì bị đánh giá là không biết.

| Điểm yếu | Vì sao chấp nhận trong đồ án | Hướng cải thiện |
| --- | --- | --- |
| Chưa HTTPS, chưa triển khai công khai | Phạm vi demo LAN | Reverse proxy (Caddy/Nginx) + chứng chỉ |
| SQLite một người ghi | Đủ cho 1 Admin và khách demo | PostgreSQL nếu nhiều Admin hoặc tải lớn |
| Tìm kiếm lọc bằng Python, chưa phân trang | Chỉ vài chục địa điểm | Cột tên đã bỏ dấu + chỉ mục, thêm `limit/offset` |
| Bộ đếm đăng nhập sai trong bộ nhớ | Chỉ một tiến trình uvicorn | Lưu vào DB hoặc Redis |
| Logic địa điểm nằm trong route | Làm nhanh theo tiến độ | Tách `services/pois.py` như danh mục |
| Có CI, chưa có CD | Không có server đích | Docker + triển khai khi main xanh |
| Ca kiểm thử trên điện thoại thiếu minh chứng | Đang bổ sung | Phiếu FT-1..23 kèm video |

---

## 9. Dùng AI để học, không để thay

- Hỏi AI **giải thích**, đừng nhờ **viết**: *"Giải thích từng dòng hàm `require_admin`, chuyện gì xảy ra nếu bỏ `Depends(get_db)`?"*
- Nhờ AI **hỏi vặn bạn**: *"Đóng vai giảng viên Công nghệ phần mềm, hỏi tôi 10 câu về `analytics_service.py`, chấm điểm câu trả lời."*
- Mỗi lần AI sửa code cho dự án: đọc diff, chạy test, và **tự giải thích lại thay đổi trong 3 câu** trước khi commit. Không giải thích được thì chưa commit.

## Tự kiểm trước buổi bảo vệ

- [ ] Tự bật API trên bản sao DB, không nhìn hướng dẫn
- [ ] Vẽ tay luồng A–D, mỗi luồng chỉ ra đúng tệp và hàm
- [ ] Giải thích 8 bảng và 3 ràng buộc quan trọng nhất
- [ ] Làm 3 bài "làm hỏng có chủ đích" và kể được test nào bắt lỗi
- [ ] Tự viết và chạy xanh 1 test mới
- [ ] Mở tab Actions, giải thích 5 job và vì sao e2e chạy sau
- [ ] Trả lời thành tiếng 22 câu ở mục 7, mỗi câu dưới 1 phút
- [ ] Nêu được 3 điểm yếu ở mục 8 kèm hướng cải thiện
