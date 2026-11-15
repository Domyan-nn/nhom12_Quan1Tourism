# Ma trận truy vết yêu cầu

Cập nhật 14/11/2026, `main` `99e3d88` (bản gốc 09/11, `c0c01ad`). Nối yêu cầu trong PRD bản 1.1 (F, BR, NFR) với use case, API, mã nguồn và [ca kiểm thử](test-cases.md). Trạng thái lấy từ lượt chạy tự động 09/11 (mọi bộ exit 0), riêng backend, guest Node/Vitest, build web và mobile Jest chạy lại 14/11 (Playwright và thiết bị chưa chạy lại; xem [test-results.md](test-results.md)) và [phiếu thực địa mobile](../mobile/testing/mobile-field-test.md).

Đường dẫn mã: `be/` = `backend/app/`, `admin/` = `apps/admin-web/src/`, `guest/` = `apps/guest-web/src/`, `mobile/` = `apps/mobile/src/`. API đều có tiền tố `/api/v1`.

## 1. Chức năng bắt buộc F01–F12

| F | Tiêu chí chấp nhận (PRD) | UC | BR | API | Mã nguồn chính | Ca kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | Chỉ hiện Công khai; tìm theo tên và danh mục, kết hợp được, báo rỗng | UC01 | BR01–BR03 | `GET /categories`, `GET /pois`, `GET /pois/{id}` | `be/api/routes/public.py`, `be/db/poi_repository.py`, `be/core/text.py`; `guest/pages/ExplorePage.jsx`, `PoiDetailPage.jsx`; `mobile/features/places/` | TC-01-01 → TC-01-07 | Tự động đạt; thiết bị (TC-01-06) chưa thử |
| F02 | Bản đồ có điểm Công khai; không cấp GPS vẫn xem; chọn điểm mở đúng chi tiết | UC02 | BR01, BR04, BR07 | `GET /pois`, `GET /pois/{id}` | `guest/pages/MapPage.jsx`, `guest/features/map/`; `mobile/features/map/` | TC-02-01 → TC-02-05 | Tự động đạt; FT-4..6 chưa thử |
| F03 | Đúng nội dung và giọng theo ngôn ngữ; thiếu giọng vẫn đọc được văn bản | UC03 | BR03, BR05 | `GET /pois/{id}`, `GET /locales` | `guest/tts/`, `guest/components/TtsControls.jsx`; `mobile/features/narration/` | TC-03-01 → TC-03-06 | Tự động đạt; TTS VI/EN trên điện thoại đạt theo phản hồi 07/11, chưa có minh chứng |
| F04 | Chỉ mobile foreground có quyền; lọc đủ điều kiện, xác nhận 5 giây, không phát chồng, tuân thủ 600 giây | UC04 | BR05, BR07, BR08 | `GET /pois`, `GET /pois/{id}` | `mobile/features/location/` (`autoPlayEngine.js`, `freshDetail.js`, `locationWatcher.js`, `AutoPlayContext.js`) | TC-04-01 → TC-04-08 | Tự động đạt; thiết bị: GPS chạy theo phản hồi 07/11, các ca biên FT-11..16, 22, 23 chưa thử |
| F05 | Đăng nhập hợp lệ tạo phiên; sai hoặc thiếu quyền bị từ chối; đăng xuất hủy phiên | UC05 | BR09, BR10 | `POST /admin/login`, `GET /admin/me`, `POST /admin/logout` | `be/api/routes/auth.py`, `be/api/dependencies.py`, `be/services/auth.py`, `be/services/login_throttle.py`, `be/core/security.py`; `admin/features/admin/auth/Admin.jsx`, `admin/services/session.js` | TC-05-01 → TC-05-07 | Đạt |
| F06 | Thêm/sửa hợp lệ; chặn tên trống, trùng và xóa danh mục còn được dùng | UC06 | BR09, BR11 | `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/{id}` | `be/api/routes/categories.py`, `be/services/categories.py`, `be/db/category_repository.py`, `be/schemas/category.py`; `admin/features/admin/categories/` | TC-06-01 → TC-06-04 | Đạt |
| F07 | Lưu nháp đủ BR04; từ chối tọa độ/bán kính sai; xóa cần xác nhận và xử lý bài liên quan | UC07 | BR04, BR12 | `GET/POST /admin/pois`, `GET/PUT/DELETE /admin/pois/{id}`, `PUT/DELETE /admin/pois/{id}/image`, `GET /api/media/pois/{file}` | `be/api/routes/admin_pois.py`, `be/api/routes/media.py`, `be/services/media.py`; `admin/features/admin/places/` (`Places.jsx`, `PlaceForm.jsx`, `PlaceList.jsx`); `guest/pages/PoiDetailPage.jsx`; `mobile/features/places/PoiDetailScreen.js` | TC-07-01 → TC-07-08 | Đạt (có upload ảnh và ghi công từ 09/11) |
| F08 | Mỗi cặp địa điểm/ngôn ngữ tối đa một bài; nội dung sai không được lưu | UC08 | BR03, BR05, BR12 | `GET/POST /admin/pois/{id}/narrations`, `PUT/DELETE /admin/pois/{id}/narrations/{nid}`, `GET /locales` | `be/api/routes/admin_pois.py`, `be/core/locales.py`; `admin/features/admin/places/NarrationEditor.jsx` | TC-08-01 → TC-08-05 | Đạt |
| F09 | Chỉ công bố khi đủ BR04 và có một bài; Ẩn làm địa điểm biến mất khỏi API khách | UC07, UC09 | BR01, BR03, BR04, BR12 | `POST /admin/pois/{id}/publish`, `POST /admin/pois/{id}/hide`, `DELETE /admin/pois/{id}` | `be/api/routes/admin_pois.py` (`change_status`, `publish_problems`); `admin/features/admin/places/PublicationPanel.jsx` | TC-09-01 → TC-09-05, TC-07-03 | Đạt |
| F10 | Hôm nay, 7 ngày và khoảng tối đa 30 ngày; phân biệt 0 với lỗi truy vấn | UC10 | BR13–BR16, BR18, BR19 | `GET /admin/stats/visits` | `be/api/routes/admin_stats.py`, `be/services/analytics_service.py`, `be/services/analytics_retention.py`; `admin/features/admin/analytics/Dashboard.jsx`, `VisitsChart.jsx` | TC-10-01 → TC-10-06 | Đạt |
| F11 | Đếm mã phiên chưa rút có last_seen trong 90 giây; làm mới 30 giây; nêu giới hạn ước lượng | UC11 | BR13, BR15, BR17–BR19 | `GET /admin/stats/active` | `be/services/analytics_service.py`; `admin/features/admin/analytics/Dashboard.jsx` | TC-11-01, TC-11-02 | Đạt |
| F12 | Chỉ thu khi đồng ý; rút dừng gửi ngay; thử lại yêu cầu rút khi mất mạng | UC12 | BR13–BR15, BR17, BR18 | `POST /analytics/heartbeat`, `POST /analytics/revoke` | `be/api/routes/analytics.py`, `be/services/analytics_service.py`, `be/schemas/analytics.py`; `guest/features/privacy/`; `mobile/features/privacy/`, `mobile/services/analyticsApi.js` | TC-12-01 → TC-12-08 | Web đạt; mobile tự động đạt, trên điện thoại với API thật chưa thử (TC-12-08) |

## 2. Quy tắc nghiệp vụ BR01–BR19

| BR | Nội dung rút gọn | Nơi thực thi | Ca kiểm thử |
| --- | --- | --- | --- |
| BR01 | Chỉ Công khai hiển thị cho khách | `be/db/poi_repository.py` (lọc `status='published'`); mobile `freshDetail.js` | TC-01-01, TC-02-01, TC-02-05, TC-04-06, TC-09-02 |
| BR02 | Tìm theo tên + lọc danh mục, kết hợp; báo rỗng | `be/db/poi_repository.py`, `be/core/text.py`; mock web/mobile | TC-01-02, TC-01-03, TC-01-06 |
| BR03 | Một bài mỗi ngôn ngữ; công bố cần ≥ 1 bài; chỉ hiện ngôn ngữ có nội dung | `UNIQUE (poi_id, locale)`, `admin_pois.py`; client không tự đổi ngôn ngữ | TC-01-04, TC-03-05, TC-08-01 → TC-08-05, TC-09-01 |
| BR04 | Trường bắt buộc, tọa độ, bán kính 20–1000; mới tạo là Nháp | `PlaceInput` trong `admin_pois.py`, CHECK trong `001_initial.sql`, `PlaceForm.jsx` | TC-02-02, TC-07-01, TC-07-02, TC-09-01, TC-09-03 |
| BR05 | Giọng đúng ngôn ngữ; thiếu giọng thì báo và cho đọc | `guest/tts/webSpeechPlayer.js`, `mobile/features/narration/narrationUtils.js`, danh sách `be/core/locales.py` | TC-03-01, TC-03-02, TC-03-06, TC-04-05, TC-08-02 |
| BR06 | Admin do vận hành cấp, không tự đăng ký | Không có route đăng ký; tài khoản tạo bằng `backend/scripts/seed_db.py` | TC-05-03, TC-DB-09 |
| BR07 | GPS tự phát chỉ mobile, có quyền, foreground; không lưu/gửi tọa độ | `mobile/features/location/locationWatcher.js`, `AutoPlayContext.js` (tọa độ chỉ trong bộ nhớ) | TC-02-03, TC-04-07 |
| BR08 | Độ mới/sai số mẫu, 5 giây, gần nhất, không phát chồng, 600 giây, ra vùng | `mobile/features/location/autoPlayEngine.js`, `geo.js` | TC-04-01 → TC-04-05, TC-04-08 |
| BR09 | Phiên hợp lệ cho mọi màn hình/API quản trị | `be/api/dependencies.py::require_admin`; `admin/services/session.js` | TC-05-01, TC-05-03, TC-05-05 |
| BR10 | Băm mật khẩu; đăng xuất hủy phiên; không có secret trong mã | `be/core/security.py`, `be/services/auth.py` | TC-05-01, TC-05-02, TC-05-04, TC-NFR01 |
| BR11 | Tên danh mục không trống, không trùng (trim, NFC, casefold); không xóa khi đang dùng | `be/schemas/category.py`, `be/services/categories.py`, UNIQUE `normalized_name` | TC-06-01 → TC-06-03 |
| BR12 | Nháp → kiểm tra → Công khai/Ẩn; sửa có hiệu lực ngay; xóa cần xác nhận | `admin_pois.py::change_status`; `PublicationPanel.jsx`, `Places.jsx` | TC-07-01, TC-07-03, TC-09-02, TC-09-04 |
| BR13 | Chỉ thu khi đồng ý | `guest/features/privacy/analyticsClient.js`, `mobile/features/privacy/AnalyticsClient.js`; UUID v4 được kiểm ở API | TC-12-01, TC-12-07 |
| BR14 | Lượt mới khi tín hiệu đầu hoặc sau ≥ 30 phút; chống trùng khi đồng thời | `be/services/analytics_service.py::record_heartbeat` (`BEGIN IMMEDIATE`) | TC-12-03 |
| BR15 | Heartbeat 30 giây khi hiển thị, có mạng; web dùng mã chung các tab | Client thống kê web/mobile | TC-12-02, TC-12-06 |
| BR16 | Ngày theo Asia/Ho_Chi_Minh; 7 ngày và khoảng 30 ngày tính cả hai đầu | `analytics_service.py` (`vn_today`, `valid_range`, `retention_cutoff`) | TC-10-01 → TC-10-03, TC-10-05, TC-10-06 |
| BR17 | Đang hoạt động = phiên chưa rút, last_seen trong 90 giây; làm mới 30 giây | `analytics_service.py::count_active_sessions`; `Dashboard.jsx` | TC-11-01, TC-11-02 |
| BR18 | Rút đồng ý: dừng gửi, loại khỏi đang hoạt động, tách mã khỏi lượt | `analytics_service.py::revoke_session`; client giữ mã chờ khi mất mạng | TC-12-04, TC-12-05 |
| BR19 | Không có dữ liệu → 0; lỗi → Không khả dụng + Thử lại; nêu giới hạn ước lượng | `Dashboard.jsx` | TC-10-04, TC-11-02 |

## 3. Yêu cầu phi chức năng NFR01–NFR11

| NFR | Yêu cầu | Ca kiểm thử | Trạng thái |
| --- | --- | --- | --- |
| NFR01 | Băm mật khẩu, bảo vệ phiên/API Admin, secret ngoài mã, HTTPS khi công khai | TC-NFR01, TC-05-01 → TC-05-07 | Đạt, trừ HTTPS: chưa có cấu hình triển khai công khai |
| NFR02 | Bản đồ/GPS/TTS lỗi vẫn dùng danh sách và đọc nội dung | TC-NFR02 | Đạt (tự động) |
| NFR03 | Kiểm tra dữ liệu ở client và backend; UNIQUE (poi_id, locale); không xóa danh mục đang dùng | TC-NFR03, TC-DB-01 → TC-DB-07 | Đạt |
| NFR04 | Dùng được trên điện thoại và máy tính; có loading, rỗng, lỗi | TC-NFR04 | Đạt (web 375/768/1440 px); mobile theo phản hồi người dùng |
| NFR05 | ≥ 5 địa điểm, 2 danh mục, mỗi địa điểm ≥ 1 bài, ≥ 1 địa điểm hai ngôn ngữ | TC-NFR05 | Đạt |
| NFR06 | Hướng dẫn cài đặt, cấu hình SQLite, tài khoản demo, dữ liệu mẫu, sao lưu, chạy web/mobile | TC-NFR06 | Đạt; cài mới trên máy khác thử 14/11 (DB tạo mới, `check-test-readiness.ps1` ra `READY` [ĐIỀN: xóa nếu chưa đạt]); phục hồi snapshot trên máy khác chưa thử |
| NFR07 | Ghi kết quả luồng chính, ngoại lệ, phân quyền, thống kê; thử GPS/TTS thật | TC-NFR07 | Một phần: còn thiếu minh chứng thiết bị |
| NFR08 | 95% của 20 request danh sách dưới 3 giây | TC-NFR08 | Đạt 06/11 (20/20) |
| NFR09 | Tiếp cận: bàn phím, nhãn ô nhập, không chỉ dựa vào màu, biểu đồ có bảng số liệu (thêm ở PRD 1.1) | TC-10-05 (đọc biểu đồ bằng Tab), TC-02-01 (marker chọn được bằng Enter) | Một phần: chưa có ca riêng cho toàn bộ yêu cầu |
| NFR10 | Nền tảng: Chrome/Edge, 375–1.440 px, Android/iOS qua Expo Go SDK 58, giao diện VI/EN (thêm ở PRD 1.1) | TC-NFR04 | Web đạt trên Edge; Chrome và điện thoại chưa ghi kết quả riêng |
| NFR11 | Quyền riêng tư: chỉ thu khi đồng ý, không thu tên/số điện thoại/tọa độ, thông báo mục đích và cách rút (thêm ở PRD 1.1) | TC-12-01 → TC-12-08 | Kỹ thuật đạt; chưa đối chiếu pháp lý |

## 4. Khoảng trống còn mở

| Hạng mục | Liên quan | Việc cần làm |
| --- | --- | --- |
| Ca thiết bị chưa có kết quả/minh chứng | F01, F02, F04, F12, B, F07 | Chạy FT-1..6, 8..27 trên điện thoại với API thật theo [kế hoạch 14/11](ke-hoach-kiem-thu-con-lai-2026-11-14.md); lưu ảnh/video vào `docs/testing/evidence/` theo [quy ước đặt tên](evidence/README.md) và ghi vào phiếu |
| HTTPS khi truy cập công khai | NFR01 | Ngoài phạm vi demo LAN; nêu là giới hạn trong báo cáo |
| Upload ảnh và ghi công tác giả trên ảnh | F07 | Đã làm 09/11 (phần mở rộng A); còn thử hiển thị ghi công trên điện thoại thật (TC-07-09, FT-27) |
| Nhật ký thao tác Admin (phần mở rộng C) | UC05–UC09, BR09, BR10 | Đã làm 12/11; `TC-AUD-01..06`, `TC-DB-11` đạt (TC-AUD-06 qua job e2e của CI). DB chính đã migrate lên schema 5 ngày 14/11 (bản trước: `backups/before-migration-005-20261114T071912Z.db`); máy demo khác tự migrate. Còn thêm vào PRD (bảng thứ 8, mục 7.1) |
| Gần tôi (phần mở rộng B) | BR07 | Web đã merge (PR #4); mobile và Playwright ở PR #7 (CI xanh, chờ duyệt). Còn merge PR #7 và thử trên điện thoại (TC-NEAR-07) |
| Cài mới toàn hệ thống trên máy khác | NFR06 | Đã thử 14/11 theo RUNNING.md, kết quả ở [test-results.md](test-results.md). Còn lại: thử phục hồi snapshot của nhóm trên máy khác |

## 5. Phần mở rộng ngoài F01–F12

| Phần | Yêu cầu | Quy tắc | API / mã nguồn chính | Ca kiểm thử | Trạng thái 14/11 |
| --- | --- | --- | --- | --- | --- |
| A. Upload ảnh và ghi công ảnh | Admin tải JPG/PNG/WebP ≤ 2 MB, ghi công ≤ 300 ký tự hiện dưới ảnh ở web và mobile | BR04, NFR01 | `PUT/DELETE /admin/pois/{id}/image`, `GET /api/media/pois/{file}`; `be/services/media.py`, migration 004 | TC-07-06 → TC-07-09, TC-DB-10 | Tự động đạt; điện thoại (TC-07-09) chưa thử |
| B. Gần tôi | Sắp danh sách Khám phá theo khoảng cách trên máy khách, không gửi tọa độ | BR07, NFR11 | Không có API mới; `guest/features/nearMe/`, `mobile/features/places/nearMe*.js`, `useNearMe.js` | TC-NEAR-01 → TC-NEAR-07 | Web đạt; mobile đạt CI PR #7 (chưa merge); điện thoại chưa thử |
| C. Nhật ký thao tác Admin | Mỗi thao tác quản trị thành công ghi một dòng; tab Nhật ký | BR09, BR10 | `GET /admin/audit-log`; `be/services/audit.py`, migration 005 | TC-AUD-01 → TC-AUD-06, TC-DB-11 | Đạt |
| G. Chạy bản build bằng một lệnh | — | — | Chưa làm | — | Chưa làm; theo quy tắc cắt phạm vi 13/11, ghi là hướng phát triển nếu nhóm chốt cắt |
