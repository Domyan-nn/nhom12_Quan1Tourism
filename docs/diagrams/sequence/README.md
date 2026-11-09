# Sơ đồ tuần tự

Bốn luồng chính, vẽ theo mã nguồn `main` ngày 09/11/2026 (không phải thiết kế dự kiến). Nguồn Mermaid nằm ngay trong tệp này; GitHub hiển thị trực tiếp. Để đưa vào báo cáo Word, dán từng khối vào <https://mermaid.live> rồi xuất PNG/SVG.

| Sơ đồ | Use case | Quy tắc |
| --- | --- | --- |
| [SD-01 Đăng nhập, khôi phục phiên, đăng xuất](#sd-01--đăng-nhập-khôi-phục-phiên-đăng-xuất-uc05) | UC05 | BR09, BR10, NFR01 |
| [SD-02 Công bố địa điểm](#sd-02--công-bố-địa-điểm-uc09) | UC09 | BR01, BR03, BR04, BR12 |
| [SD-03 Đồng ý, heartbeat và rút đồng ý thống kê](#sd-03--đồng-ý-heartbeat-và-rút-đồng-ý-thống-kê-uc12) | UC12, UC10, UC11 | BR13–BR18 |
| [SD-04 Tự động phát theo GPS](#sd-04--tự-động-phát-theo-gps-uc04) | UC04 | BR01, BR05, BR07, BR08 |

## SD-01 — Đăng nhập, khôi phục phiên, đăng xuất (UC05)

Mã: `backend/app/api/routes/auth.py`, `backend/app/services/auth.py`, `backend/app/services/login_throttle.py`, `apps/admin-web/src/features/admin/auth/Admin.jsx`, `apps/admin-web/src/services/session.js`.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant W as Admin web
    participant S as sessionStorage
    participant API as FastAPI
    participant T as LoginThrottle
    participant DB as SQLite

    A->>W: Nhập tên đăng nhập và mật khẩu
    W->>API: POST /api/v1/admin/login
    API->>T: retry_after(tên đã chuẩn hóa)
    alt Sai từ 5 lần trong 15 phút
        T-->>API: Còn phải chờ N giây
        API-->>W: 429 TOO_MANY_ATTEMPTS, Retry-After N
        W-->>A: Đăng nhập sai quá nhiều lần
    else Được thử
        API->>DB: Tìm admin_accounts theo username
        API->>API: Kiểm tra PBKDF2-SHA256
        alt Sai thông tin hoặc tài khoản bị khóa (E1)
            API->>T: record_failure
            API-->>W: 401 INVALID_CREDENTIALS
            W-->>A: Thông báo thất bại chung
        else Hợp lệ
            API->>T: reset
            API->>DB: INSERT admin_sessions với SHA-256 của token, hết hạn sau 8 giờ
            API->>DB: DELETE phiên đã hết hạn quá 7 ngày
            API-->>W: 200 access_token, expires_at
            W->>S: Lưu token, expires_at, username
            W-->>A: Trang quản trị
        end
    end

    Note over A,DB: Tải lại trang trong cùng tab (A1)
    W->>S: Đọc phiên đã lưu
    W->>API: GET /api/v1/admin/me với Bearer token
    API->>DB: Tìm phiên theo SHA-256 của token
    alt Phiên còn hạn, chưa thu hồi, tài khoản hoạt động
        API-->>W: 200 id, username
        W-->>A: Vào thẳng trang quản trị
    else Hết hạn hoặc đã thu hồi (E2)
        API-->>W: 401 AUTH_REQUIRED
        W->>S: Xóa phiên
        W-->>A: Trang đăng nhập và thông báo phiên hết hạn
    end

    A->>W: Đăng xuất
    W->>API: POST /api/v1/admin/logout
    API->>DB: UPDATE admin_sessions SET revoked_at
    API-->>W: 204
    W->>S: Xóa phiên
    W-->>A: Trang đăng nhập
```

## SD-02 — Công bố địa điểm (UC09)

Mã: `backend/app/api/routes/admin_pois.py` (`change_status`, `publish_problems`), `apps/admin-web/src/features/admin/places/PublicationPanel.jsx`. Kiểm tra điều kiện và đổi trạng thái nằm trong cùng giao dịch `BEGIN IMMEDIATE`, nên hai yêu cầu đồng thời chỉ một yêu cầu thành công.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant W as Admin web
    participant API as FastAPI
    participant DB as SQLite
    participant G as App khách

    A->>W: Chọn địa điểm Nháp hoặc Ẩn, bấm Công bố
    W-->>A: Hộp xác nhận
    alt Hủy (A2)
        A->>W: Hủy
        W-->>A: Giữ trạng thái cũ
    else Đồng ý
        A->>W: Xác nhận
        W->>API: POST /api/v1/admin/pois/id/publish
        API->>API: require_admin kiểm tra phiên (BR09)
        API->>DB: BEGIN IMMEDIATE
        API->>DB: Đọc địa điểm
        alt Không tồn tại
            API-->>W: 404 POI_NOT_FOUND
        else Trạng thái không phải draft hoặc hidden
            API->>DB: ROLLBACK
            API-->>W: 409 INVALID_STATUS_TRANSITION
            W-->>A: Trạng thái đã thay đổi, chọn lại địa điểm
        else Được phép chuyển
            API->>DB: Kiểm tra BR04 và ít nhất một bài hợp lệ
            alt Còn thiếu (E1)
                API->>DB: ROLLBACK
                API-->>W: 422 POI_NOT_PUBLISHABLE kèm danh sách mục thiếu
                W-->>A: Chưa đủ điều kiện công bố, nêu từng mục
            else Đủ điều kiện
                API->>DB: UPDATE pois SET status = published
                API->>DB: COMMIT
                API-->>W: 200 địa điểm với trạng thái mới
                W-->>A: Đã công bố
            end
        end
    end
    G->>API: GET /api/v1/pois
    API-->>G: Danh sách chỉ gồm địa điểm Công khai (BR01)
```

## SD-03 — Đồng ý, heartbeat và rút đồng ý thống kê (UC12)

Mã: `apps/guest-web/src/features/privacy/analyticsClient.js`, `apps/mobile/src/features/privacy/AnalyticsClient.js`, `backend/app/api/routes/analytics.py`, `backend/app/services/analytics_service.py`. Mỗi heartbeat được xử lý trong một giao dịch `BEGIN IMMEDIATE` để các request đồng thời không tạo trùng lượt (BR14).

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách
    participant C as App khách
    participant L as Lưu trữ cục bộ
    participant API as FastAPI
    participant DB as SQLite

    K->>C: Mở app lần đầu
    C-->>K: Hộp lựa chọn thống kê
    alt Từ chối (A1)
        K->>C: Từ chối
        C->>L: consent = denied, không tạo mã
        Note over C: Không gửi gì, vẫn dùng nội dung công khai (BR13)
    else Đồng ý
        K->>C: Đồng ý
        C->>L: Lưu session_id là UUID v4 rồi consent = granted
        loop Mỗi 30 giây khi app hiển thị và có mạng (BR15)
            C->>API: POST /api/v1/analytics/heartbeat
            API->>DB: BEGIN IMMEDIATE, đọc anonymous_sessions
            alt Phiên chưa có
                API->>DB: INSERT phiên và lượt đầu tiên
                API-->>C: 204
            else Phiên đã rút
                API-->>C: 409 session_revoked
                C->>L: Xóa mã, consent = denied
            else Cách lần trước từ 30 phút (BR14)
                API->>DB: INSERT lượt mới, cập nhật last_seen
                API-->>C: 204
            else Đang liên tục
                API->>DB: Cập nhật last_seen
                API-->>C: 204
            end
        end
    end

    K->>C: Rút đồng ý (A2)
    C->>C: Dừng heartbeat ngay (web: ở mọi tab cùng nguồn)
    C->>L: Lưu mã chờ rút trước, rồi xóa session_id
    C->>API: POST /api/v1/analytics/revoke
    alt Có mạng
        API->>DB: UPDATE visit_events SET session_id = NULL
        API->>DB: UPDATE anonymous_sessions SET consent_granted = 0
        API-->>C: 204
        C->>L: Xóa mã chờ
    else Mất mạng hoặc server lỗi (E1)
        C->>C: Giữ mã chờ, thử lại khi có mạng, khi mở lại app và mỗi 30 giây
    end

    Note over API,DB: Admin đọc thống kê (UC10, UC11)
    API->>DB: Đếm lượt theo ngày Asia/Ho_Chi_Minh (BR16)<br/>và phiên chưa rút có last_seen trong 90 giây (BR17)
```

## SD-04 — Tự động phát theo GPS (UC04)

Mã: `apps/mobile/src/features/location/` (`AutoPlayContext.js`, `locationWatcher.js`, `autoPlayEngine.js`, `freshDetail.js`), `apps/mobile/src/features/narration/NarrationPlayer.js`. Tọa độ chỉ nằm trong bộ nhớ của engine, không lưu và không gửi đi (BR07).

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách
    participant AC as AutoPlayContext
    participant LW as LocationWatcher
    participant OS as GPS thiết bị
    participant E as AutoPlayEngine
    participant API as FastAPI
    participant P as NarrationPlayer

    K->>AC: Bật Tự phát
    AC->>LW: setActive(true) khi app ở foreground
    LW->>OS: Xin quyền vị trí foreground
    alt Từ chối (E1)
        OS-->>LW: denied
        LW-->>AC: denied
        AC-->>K: Báo lỗi, tắt công tắc, vẫn nghe thủ công được
    else Cho phép
        LW->>OS: watchPosition mỗi 1 giây
        loop Mỗi mẫu GPS
            OS-->>LW: Vĩ độ, kinh độ, sai số, thời điểm
            LW->>AC: onLocation(mẫu)
            AC->>E: evaluate(mẫu, POI công khai, ngôn ngữ, đang phát)
            Note over E: BR08: bỏ mẫu quá 15 giây, tương lai quá 1 giây,<br/>sai số quá min(50 m, r/2). Cần trong vùng liên tục 5 giây.<br/>Ứng viên: có bài ở ngôn ngữ đã chọn, chưa phát hoặc<br/>vào lại sau 600 giây, đã hết thời gian chờ sau lỗi.
            alt Không có ứng viên hoặc đang phát
                E-->>AC: Chờ mẫu tiếp theo
            else Có ứng viên
                E-->>AC: POI gần nhất, bằng nhau thì theo mã
                AC->>API: GET /api/v1/pois/id (luôn hỏi lại server)
                alt 404, địa điểm vừa bị ẩn (BR01)
                    API-->>AC: 404 POI_NOT_FOUND
                    AC->>E: recordFailure(POI)
                    AC->>AC: Bỏ POI khỏi danh sách, ghi nhật ký
                else Có dữ liệu, hoặc mất mạng mà còn bản đã tải
                    API-->>AC: Chi tiết và bài thuyết minh
                    AC->>P: play(bài đúng ngôn ngữ)
                    alt TTS bắt đầu phát
                        P-->>AC: true
                        AC->>E: recordPlaySuccess(POI)
                    else Thiếu giọng hoặc TTS lỗi (E2)
                        P-->>AC: false
                        AC->>E: recordFailure(POI), chờ 30 giây mới xét lại
                    end
                end
            end
        end
    end
    K->>AC: Đưa app xuống nền hoặc tắt Tự phát
    AC->>LW: setActive(false), gỡ watcher
```
