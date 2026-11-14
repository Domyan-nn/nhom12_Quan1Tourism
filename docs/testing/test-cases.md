# Danh sách ca kiểm thử

Cập nhật 09/11/2026 theo PRD và mã nguồn `main` (`c0c01ad`); bổ sung 14/11 phần mở rộng B và các ca thực địa FT-24..27. Chiến lược ở [test-plan.md](test-plan.md); truy vết F/BR/NFR → ca ở [traceability-matrix.md](traceability-matrix.md).

**Cách đọc**

- Mã ca: `TC-<UC>-<số>`. Ca phi chức năng là `TC-NFRxx`, ca dữ liệu/hạ tầng là `TC-DB-xx`.
- Cột *Kiểm chứng* chỉ tới test tự động: tên test Python (`tệp.py::hàm`) hoặc tên test JavaScript (`tệp.js › "tiêu đề"`), đường dẫn tương đối từ `backend/tests/`, `apps/guest-web/tests/` hoặc `apps/mobile/tests/`.
- `FT-n` là ca số n trong [phiếu thực địa mobile](../mobile/testing/mobile-field-test.md).
- "Đạt 14/11" là lượt chạy lại trên `main` `608bac1` ngày 14/11: backend 132/132, guest 40 + 20, mobile 134 (+4 HTTP bỏ qua), build Admin/guest đạt; CI cùng commit xanh 5/5 job. "Đạt CI PR #7" là kết quả CI của nhánh `feat/b-near-me-mobile` (chưa merge); chạy tại máy 14/11: mobile 150 (+4 bỏ qua), guest 40 + 20.
- Kế hoạch chạy các ca còn lại: [ke-hoach-kiem-thu-con-lai-2026-11-14.md](ke-hoach-kiem-thu-con-lai-2026-11-14.md).
- *Kết quả*: "Đạt 09/11" là lượt chạy tự động ngày 09/11/2026 (lượt cuối, sau phần upload ảnh): backend 113/113, guest 26 + 20, mobile 124 (+4 HTTP bỏ qua), Playwright 41 (+1 OSM bỏ qua). Ca thủ công chưa có kết quả ghi "Chưa thử".

Mã cũ (đợt 02/11) đổi tên: API-01 → TC-01-01, API-02 → TC-01-02, API-03 → TC-01-04, WEB-01 → TC-01-05, WEB-02 → TC-01-07, WEB-03 → TC-01-04, WEB-04 → TC-01-05, WEB-05 → TC-12-01, DB-01..06 → TC-DB-01..06.

## UC01 — Tra cứu và xem thông tin địa điểm

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-01-01 | Có POI nháp, ẩn, công khai; gọi danh sách và chi tiết | Chỉ POI công khai trong danh sách; chi tiết nháp/ẩn/không tồn tại trả 404 `POI_NOT_FOUND`, web hiện "không khả dụng" | BR01 | `test_public_api.py::test_public_visibility_search_and_detail`; `guest.spec.js › "missing, draft and hidden detail show unavailable"` | Đạt 09/11 |
| TC-01-02 | Tìm theo tên: hoa/thường, NFC/NFD, không gõ dấu ("ben thanh"), từ khóa `%` | Khớp đúng POI; `%` không phải ký tự đại diện | BR02 | `test_public_api.py::test_public_visibility_search_and_detail`; `publicApi.test.js › "mock search ignores Vietnamese diacritics…"`; `places/exploreFilter.test.js` | Đạt 09/11 |
| TC-01-03 | Lọc danh mục, kết hợp với từ khóa; điều kiện không khớp | Kết hợp AND; không khớp hiện thông báo rỗng (E1) | BR02 | `guest.spec.js › "real search, category filter, combination and empty state"`; `exploreFilter.test.js › "không có kết quả -> mảng rỗng (UC01-E1)"` | Đạt 09/11 |
| TC-01-04 | Mở chi tiết POI có vi/en/fr; đổi ngôn ngữ giao diện | Chỉ hiện ngôn ngữ có bài, tên ngôn ngữ đúng; bài đang chọn giữ nguyên khi đổi giao diện | BR03 | `guest.spec.js › "real API lists only published POIs, renders locales and supports languages beyond VI/EN"`, `"mock is labelled… UI language preserves selected narration"` | Đạt 09/11 |
| TC-01-05 | Mất mạng, phản hồi sai định dạng, tải danh mục lỗi | Báo lỗi đúng loại kèm Thử lại; không tự chuyển sang dữ liệu giả (E2) | NFR02 | `guest.spec.js › "network error shows retry…"`, `"loading and category errors are visible and translated"`; `publicApi.test.js › "empty lists, network failure and invalid envelopes remain distinct"`; `services/publicApi.test.js` (mobile) | Đạt 09/11 |
| TC-01-06 | Mobile: tìm "đức", lọc danh mục, tìm từ không tồn tại, tắt mạng rồi tìm | Như TC-01-02/03/05; mất mạng vẫn xem dữ liệu đã tải | BR02, NFR02 | FT-1, FT-2, FT-3 | Chưa thử |
| TC-01-07 | Chế độ mock | Có nhãn mock; không gọi API | — | `guest.spec.js › "mock is labelled, never calls API…"`; `map.spec.js › "mock map is labelled and makes no API requests"` | Đạt 09/11 |

## UC02 — Xem bản đồ địa điểm

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-02-01 | Mở bản đồ, chọn marker, xem chi tiết | Marker đúng các POI công khai; tóm tắt rồi mở đúng chi tiết | BR01 | `map.spec.js › "real public API map draws published markers…"`; `map/MapScreen.test.js › "draws and fits the same valid markers…"` | Đạt 09/11 |
| TC-02-02 | API trả tọa độ/ID hỏng, trùng, biên ±90/±180 | Loại điểm hỏng, giữ điểm hợp lệ, bản đồ không lỗi | BR04 | `mapMarkers.test.js` (web và mobile); `map.spec.js › "mixed valid and malformed API coordinates/IDs…"` | Đạt 09/11 |
| TC-02-03 | Từ chối quyền vị trí | Vẫn xem bản đồ, không có chấm vị trí (A1) | BR07 | `MapScreen.test.js › "…still works when GPS is denied"`; FT-5 | Đạt 09/11 (tự động); FT-5 chưa thử |
| TC-02-04 | Tile nguồn chính lỗi; mọi nguồn lỗi; API chậm/lỗi | Chuyển nguồn dự phòng; hết nguồn thì báo lỗi, còn danh sách thay thế và Thử lại (E1) | NFR02 | `map.spec.js › "secondary tile source…"`, `"tile error keeps summary controls and list fallback usable…"`, `"slow API has loading state…"`, `"map … error retries real API…"`; `MapScreen.test.js › "native map timeout retries…"` | Đạt 09/11 |
| TC-02-05 | Admin ẩn POI sau khi khách đã tải bản đồ, khách chọn marker đó | Báo không khả dụng, bỏ marker; không mở chi tiết chưa kiểm tra (E2) | BR01 | `map.spec.js › "place hidden after list load is rejected…"`, `"detail validation network error…"`; `MapScreen.test.js › "hidden marker is removed…"`; FT-6 | Đạt 09/11 (tự động); FT-6 chưa thử |

## UC03 — Chọn ngôn ngữ và nghe thuyết minh

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-03-01 | Chọn vi/en, bấm Nghe | Phát bằng giọng đúng mã ngôn ngữ | BR05 | `webSpeechPlayer.test.js › "plays with a voice of the right language…"`; `narration/narrationUtils.test.js › "phát bằng giọng đúng ngôn ngữ…"`; FT-7 | Đạt 09/11; FT-7 đạt theo phản hồi người dùng 07/11, chưa có minh chứng |
| TC-03-02 | Thiết bị không có giọng của ngôn ngữ | Báo thiếu giọng, vẫn đọc được văn bản, không dùng giọng sai (E1) | BR05 | `webSpeechPlayer.test.js › "missing voice for the language…"`; `integration.spec.js › "missing narration voice keeps database text visible…"`; FT-9 | Đạt 09/11 (tự động); FT-9 chưa thử |
| TC-03-03 | Nền tảng không hỗ trợ tạm dừng (Android) | Có Dừng/Nghe lại, không có Tạm dừng (E2) | — | `webSpeechPlayer.test.js › "pause unsupported…"`; `NarrationPanel.test.js › "Android without pause exposes Stop…"`; FT-10 | Đạt 09/11 (tự động); FT-10 chưa thử |
| TC-03-04 | Đổi ngôn ngữ hoặc rời trang khi đang đọc | Dừng giọng cũ, bỏ callback muộn | — | `integration.spec.js › "changing language and place cancels speech…"`; `NarrationPlayer.test.js › "changing narration language cancels the old voice…"` | Đạt 09/11 |
| TC-03-05 | Chọn ngôn ngữ chưa có bài | Không tự đổi sang ngôn ngữ khác (A1) | BR03 | `narrationUtils.test.js › "không tự đổi ngôn ngữ (BR03, UC03-A1)"`; `NarrationPanel.test.js › "missing content never falls back to another language"`; FT-8 | Đạt 09/11 (tự động); FT-8 chưa thử |
| TC-03-06 | Văn bản dài; lỗi engine; lỗi tạm dừng/tiếp tục | Đọc đủ theo đoạn; lỗi thì dừng và cho Nghe lại | BR05 | `webSpeechPlayer.test.js` (18 ca), `NarrationPlayer.test.js` (12 ca) | Đạt 09/11 |

## UC04 — Tự động phát khi đến gần địa điểm (mobile)

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-04-01 | Mẫu GPS cũ > 15 s, tương lai > 1 s, sai số > min(50 m, r/2), thiếu sai số, tọa độ hỏng | Bỏ mẫu cho POI đó | BR08 | `location/autoPlayEngine.test.js` › nhóm "BR08 – mẫu hợp lệ" | Đạt 09/11 |
| TC-04-02 | Ở trong vùng < 5 s, đủ 5 s; bật khi đã ở trong vùng; khe hở > 15 s | Chỉ phát khi liên tục ≥ 5 s (A1) | BR08 | `autoPlayEngine.test.js › "chưa đủ 5 giây thì chưa phát…"`, `"bật khi đã ở trong vùng…"`, `"khe hở > 15 giây…"` | Đạt 09/11 |
| TC-04-03 | Hai POI chồng vùng, một POI thiếu bài, cùng khoảng cách | Lọc POI đủ điều kiện trước, chọn gần nhất; bằng nhau chọn theo mã; không phát chồng | BR08 | `autoPlayEngine.test.js › "lọc ứng viên đủ điều kiện TRƯỚC…"`, `"chọn điểm gần nhất…"`, `"không phát chồng…"`; FT-22 | Đạt 09/11 (tự động); FT-22 chưa thử |
| TC-04-04 | Đứng lại sau khi phát; ra rồi vào lại < 600 s và ≥ 600 s; vùng đệm | Không phát lại khi còn trong vùng hoặc vào lại sớm; phát lại sau 600 s | BR08 | `autoPlayEngine.test.js` (4 ca); FT-13, FT-14, FT-15 | Đạt 09/11 (tự động); FT chưa thử |
| TC-04-05 | TTS lỗi hoặc tải bài lỗi | Không tính là đã phát; chờ 30 s rồi mới thử lại, POI khác vẫn được xét (E2) | BR05, BR08 | `autoPlayEngine.test.js` nhóm "UC04-E2 – chờ sau khi thử phát thất bại"; `narrationUtils.test.js › "TTS lỗi…"` | Đạt 09/11 |
| TC-04-06 | Admin ẩn POI sau khi app đã tải danh sách, khách đi vào vùng POI đó | App hỏi lại server; 404 thì bỏ POI, không phát; mất mạng thì dùng bản đã tải | BR01 | `location/freshDetail.test.js` (3 ca); FT-23 | Đạt 09/11 (tự động); FT-23 chưa thử |
| TC-04-07 | Từ chối quyền vị trí; đưa app xuống nền khi đang theo dõi | Báo lỗi và tắt công tắc (E1); nền thì dừng theo dõi, không giữ watcher muộn | BR07 | `location/locationWatcher.test.js` (4 ca); FT-12, FT-16 | Đạt 09/11 (tự động); FT chưa thử |
| TC-04-08 | Bật tự phát, đi vào vùng một địa điểm thật | Phát sau ≥ 5 s trong vùng | BR08 | FT-11 | Người dùng báo GPS hoạt động ổn 07/11; FT-11 chưa ghi kết quả |

## UC05 — Đăng nhập và đăng xuất Admin

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-05-01 | Đăng nhập đúng (tên có khoảng trắng/hoa) | 200, token; DB chỉ lưu SHA-256 của token; `Cache-Control: no-store` | BR09, BR10 | `test_admin_api.py::test_health_and_seed_password_login` | Đạt 09/11 |
| TC-05-02 | Sai mật khẩu, tên không tồn tại, tài khoản bị khóa | Cùng 401 `INVALID_CREDENTIALS`, không lộ mật khẩu, không tạo phiên (E1) | BR10 | `test_admin_api.py::test_wrong_password_unknown_and_locked_are_generic`; `admin.spec.js › "Admin rejects incorrect password…"` | Đạt 09/11 |
| TC-05-03 | Gọi API Admin không token, token sai/hết hạn/thu hồi, tài khoản bị khóa | 401 `AUTH_REQUIRED` cho mọi route quản trị (E2) | BR09 | `test_admin_api.py::test_admin_routes_require_authentication`, `::test_expired_revoked_and_locked_session`; `test_admin_pois.py::test_place_routes_reject_invalid_sessions`; `test_day4.py::test_publish_requires_auth`, `::test_stats_require_admin` | Đạt 09/11 |
| TC-05-04 | Đăng xuất rồi dùng lại token | Token cũ bị từ chối | BR10 | `test_admin_api.py::test_logout_rejects_reuse`; `admin.spec.js › "Admin rejects incorrect password, … rejects reused token"` | Đạt 09/11 |
| TC-05-05 | Tải lại trang khi còn phiên; token đã bị thu hồi | Vào thẳng trang quản trị (A1); token thu hồi thì về đăng nhập kèm thông báo | BR09 | `admin.spec.js › "Admin session survives reload in the same tab…"` | Đạt 09/11 |
| TC-05-06 | Sai mật khẩu 5 lần trong 15 phút | Lần 6 trả 429 kèm `Retry-After`, không kiểm tra mật khẩu; tên khác đếm riêng; đăng nhập đúng xóa bộ đếm | NFR01 | `test_admin_api.py::test_repeated_failures_are_throttled_per_username`; `admin.spec.js › "Repeated failed sign-ins are throttled…"` | Đạt 09/11 |
| TC-05-07 | Có phiên hết hạn quá 7 ngày và phiên mới hết hạn | Đăng nhập xóa phiên quá 7 ngày, giữ phiên còn lại | — | `test_admin_api.py::test_login_removes_long_expired_sessions_only` | Đạt 09/11 |

## UC06 — Quản lý danh mục

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-06-01 | Thêm/sửa tên VI/EN có khoảng trắng, chữ hoa, dạng NFD | Trim, NFC; trùng không phân biệt hoa/thường trả 409 `CATEGORY_DUPLICATE` (E1) | BR11 | `test_admin_api.py::test_create_update_and_normalized_duplicates`; `admin.spec.js › "Admin category CRUD, NFC duplicates…"` | Đạt 09/11 |
| TC-06-02 | Tên trống, chỉ khoảng trắng, > 200 ký tự, thiếu tên EN; sửa/xóa ID không tồn tại | 422; 404 `CATEGORY_NOT_FOUND` | BR11 | `test_admin_api.py::test_empty_invalid_and_missing`; `admin.spec.js` (cùng ca CRUD) | Đạt 09/11 |
| TC-06-03 | Xóa danh mục đang có POI; xóa danh mục chưa dùng; hủy xác nhận | 409 `CATEGORY_IN_USE` (E2); xóa được danh mục trống; hủy thì giữ nguyên (A2) | BR11 | `test_admin_api.py::test_delete_used_and_unused`; `admin.spec.js` (cùng ca CRUD) | Đạt 09/11 |
| TC-06-04 | Tải danh sách danh mục lỗi mạng | Báo lỗi và Thử lại khôi phục | NFR02 | `admin.spec.js › "Admin category load error retries…"` | Đạt 09/11 |

## UC07 — Quản lý địa điểm

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-07-01 | Tạo địa điểm hợp lệ rồi sửa | Mới tạo là Nháp; không xuất hiện ở API khách; sửa được | BR04, BR12 | `test_admin_pois.py::test_places_and_narrations`; `admin.spec.js › "Admin saves a draft and narration…"` | Đạt 09/11 |
| TC-07-02 | Vĩ độ 91/−90/90, kinh độ −181/±180, bán kính 19/20/1000/1001/20.5, `true`, chuỗi số, tên/địa chỉ trống, danh mục không tồn tại, URL ảnh `file://` | Biên hợp lệ được lưu; còn lại 422, dữ liệu cũ giữ nguyên (E1) | BR04 | `test_admin_pois.py::test_places_and_narrations`, `::test_boundaries_edit_validation_and_narration_ownership` | Đạt 09/11 |
| TC-07-03 | Xóa địa điểm: hủy rồi xác nhận | Hủy giữ nguyên (A2); xác nhận xóa địa điểm và mọi bài liên quan (A1) | BR12 | `admin.spec.js` (cùng ca lưu nháp); `test_admin_pois.py::test_places_and_narrations` | Đạt 09/11 |
| TC-07-04 | Bấm Lưu khi request trước chưa xong | Khóa nút và ô nhập đến khi xong (chống gửi đúp) | — | `admin.spec.js` (cùng ca lưu nháp) | Đạt 09/11 |
| TC-07-05 | Danh sách Admin: tìm "cho ben", lọc trạng thái Ẩn | Đúng địa điểm; nhãn trạng thái tiếng Việt | — | `admin.spec.js` (cùng ca lưu nháp) | Đạt 09/11 |
| TC-07-06 | Tải ảnh lên: JPG/PNG/WebP hợp lệ; GIF/SVG; nội dung giả mạo; > 2 MB; địa điểm không tồn tại; không đăng nhập (E2) | Ảnh hợp lệ được lưu, phục vụ đúng loại, ảnh cũ bị xóa; còn lại 415/422/413/404/401, không lưu tệp nào | BR04, BR09 | `test_poi_images.py::test_upload_each_allowed_type…`, `::test_rejects_wrong_type_spoofed_content_oversize_and_missing_place`, `::test_upload_and_delete_require_admin`; `admin.spec.js › "Admin uploads an image with credit…"` | Đạt 09/11 |
| TC-07-07 | Ghi công ảnh; xóa ảnh; đổi sang URL; xóa địa điểm | Ghi công ≤ 300 ký tự, hiện ở API khách và dưới ảnh trang chi tiết; xóa ảnh/đổi URL/xóa địa điểm thì tệp cũ bị xóa | BR04 | `test_poi_images.py::test_credit_is_saved_trimmed_public_and_cleared_with_the_image`, `::test_switching_to_url_or_deleting_place_removes_uploaded_file`; `admin.spec.js` (cùng ca) | Đạt 09/11 |
| TC-07-08 | Gán đường dẫn ảnh của địa điểm khác; đường dẫn giả mạo `../`; tải tệp không tồn tại | 422; 404; không đọc được tệp ngoài thư mục ảnh | NFR01 | `test_poi_images.py::test_uploaded_url_cannot_be_reused_by_another_place_or_forged` | Đạt 09/11 |
| TC-07-09 | Điện thoại thật với API thật: mở chi tiết địa điểm có ảnh Wikimedia và địa điểm có ảnh tải lên qua Admin | Ảnh hiện; dòng "Ảnh: …" (ghi công) nằm ngay dưới ảnh; ảnh tải lên đi qua `/api/media` vẫn hiện trên điện thoại | BR04 | FT-27 | Chưa thử |

## UC08 — Quản lý thuyết minh đa ngôn ngữ

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-08-01 | Thêm bài vi/en/fr; thêm lại `VI` | 201; trùng ngôn ngữ trả 409 `NARRATION_DUPLICATE`; Admin khóa ngôn ngữ đã có bài (A1) | BR03 | `test_admin_pois.py::test_places_and_narrations`; `admin.spec.js` (cùng ca lưu nháp) | Đạt 09/11 |
| TC-08-02 | Mã ngoài danh sách hỗ trợ (`xx`, `de`, `vi-vn`, `!`) | 422; Admin không liệt kê mã đó | BR03, BR05 | `test_admin_pois.py::test_supported_locales_and_narration_delete_rules`; `admin.spec.js` | Đạt 09/11 |
| TC-08-03 | Tiêu đề/nội dung trống; lưu khi mất mạng | 422; lỗi mạng giữ nội dung đã nhập, lưu lại được (E1, E2) | BR03 | `test_admin_pois.py::test_boundaries_edit_validation_and_narration_ownership`; `admin.spec.js` | Đạt 09/11 |
| TC-08-04 | Sửa/xóa bài qua đường dẫn của địa điểm khác | 404 `NARRATION_NOT_FOUND` | BR03 | `test_admin_pois.py::test_boundaries_edit_validation_and_narration_ownership`, `::test_supported_locales_and_narration_delete_rules` | Đạt 09/11 |
| TC-08-05 | Xóa bài; xóa bài hợp lệ cuối của địa điểm đang công khai | Xóa được (có xác nhận); bài cuối của địa điểm công khai trả 409 `NARRATION_REQUIRED` | BR03 | `test_admin_pois.py::test_supported_locales_and_narration_delete_rules`; `admin.spec.js` | Đạt 09/11 |

## UC09 — Công bố hoặc ẩn địa điểm

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-09-01 | Công bố địa điểm chưa có bài; thêm bài rồi công bố | 422 `POI_NOT_PUBLISHABLE` nêu mục thiếu (E1); sau khi đủ thì Công khai và API khách trả về | BR03, BR04 | `test_day4.py::test_publish_needs_narration_then_hide`; `acceptance.spec.js › "UC09 Admin publication…"` | Đạt 09/11 |
| TC-09-02 | Ẩn địa điểm Công khai; công bố/ẩn lặp lại | Biến mất khỏi API khách; chuyển sai trạng thái trả 409 `INVALID_STATUS_TRANSITION` | BR01, BR12 | `test_day4.py::test_publish_needs_narration_then_hide`; `acceptance.spec.js` | Đạt 09/11 |
| TC-09-03 | Dữ liệu cũ: bài hỏng, bán kính lẻ | Không công bố được, nêu mục sai | BR04 | `test_day4.py::test_publish_rejects_legacy_invalid_narration_and_fractional_radius` | Đạt 09/11 |
| TC-09-04 | Hai yêu cầu công bố cùng lúc | Chỉ một lần chuyển trạng thái thành công | BR12 | `test_day4.py::test_concurrent_publication_allows_one_transition` | Đạt 09/11 |
| TC-09-05 | Công bố ID không tồn tại; hủy hộp xác nhận | 404; hủy thì giữ trạng thái (A2) | — | `test_day4.py::test_publish_unknown_place`; `acceptance.spec.js` | Đạt 09/11 |

## UC10 — Xem thống kê lượt truy cập

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-10-01 | Mở Dashboard | Hôm nay, 7 ngày (gồm hôm nay), thời điểm đo, chú thích giờ Việt Nam | BR16, BR19 | `test_day4.py::test_visit_stats_and_range_validation`; `acceptance.spec.js › "UC10-11 dashboard shows real numbers and Vietnam dates…"` | Đạt 09/11 |
| TC-10-02 | Lượt sát nửa đêm giờ VN (khác ngày UTC) | Tính theo ngày Asia/Ho_Chi_Minh | BR16 | `test_day4.py::test_day_boundary_vietnam_time`, `::test_stats_routes_share_vietnam_clock_and_exact_active_boundary` | Đạt 09/11 |
| TC-10-03 | Khoảng ngày hợp lệ, đảo ngược, ngoài 30 ngày | Trả tổng và từng ngày; sai trả 422 `INVALID_DATE_RANGE`, không truy vấn (E1) | BR16 | `test_day4.py::test_visit_stats_and_range_validation`; `acceptance.spec.js` | Đạt 09/11 |
| TC-10-04 | Truy vấn thống kê lỗi | Hiện "Không khả dụng", không thay bằng 0; Thử lại khôi phục (E2) | BR19 | `acceptance.spec.js › "UC10-11 dashboard…"` | Đạt 09/11 |
| TC-10-05 | Khoảng 30 ngày | Biểu đồ đủ 30 cột, rê chuột/Tab đọc số; khung 375 px không tràn trang | BR16 | `acceptance.spec.js › "UC10 range chart draws one bar per Vietnam day…"` | Đạt 09/11 |
| TC-10-06 | Dữ liệu sát mốc 30 ngày; startup; 00:00 VN; dọn lỗi | Xóa lượt/phiên quá hạn theo ngày VN, giữ đúng mốc; lỗi thì ghi log và thử lại sau 60 s | BR16 | `test_analytics.py::test_cutoff_is_start_of_day_minus_29_days_vn`, `::test_cleanup_boundary_both_sides`, `::test_cleanup_uses_vietnam_day_not_utc_day`; `test_analytics_integration.py::test_startup_really_cleans_only_expired_data`, `::test_midnight_loop_triggers_real_cleanup…`, `::test_cleanup_failure_is_logged_and_retried…` | Đạt 09/11 |

## UC11 — Xem số khách đang hoạt động

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-11-01 | Phiên có last_seen cách 89 s và 90 s; phiên đã rút | Chỉ đếm phiên chưa rút trong (now − 90 s, now]: 89 s được đếm, 90 s không | BR17 | `test_analytics.py::test_active_window_is_90_seconds_exclusive`; `test_day4.py::test_active_sessions_90s`, `::test_stats_routes_share_vietnam_clock_and_exact_active_boundary` | Đạt 09/11 |
| TC-11-02 | Chờ 30 s; API lỗi rồi phục hồi | Tự làm mới 30 s khi trang hiển thị; lỗi hiện "Không khả dụng" kèm lần thành công gần nhất (E1) | BR17, BR19 | `acceptance.spec.js › "UC10-11 dashboard…"` | Đạt 09/11 |

## UC12 — Đồng ý hoặc rút đồng ý thống kê

| Mã | Tình huống | Kết quả mong đợi | BR | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-12-01 | Chưa chọn hoặc Từ chối | Không tạo mã, không gửi; vẫn dùng nội dung công khai (A1) | BR13 | `src/features/privacy/analyticsClient.test.js` (guest); `privacy/AnalyticsClient.test.js` (mobile); `integration.spec.js › "decline never creates a session…"`; `guest.spec.js › "privacy describes its current functionality…"` | Đạt 09/11 |
| TC-12-02 | Đồng ý; ẩn trang/app; mất mạng | Tạo UUID v4, gửi ngay rồi mỗi 30 s khi hiển thị và có mạng; ẩn/mất mạng thì dừng | BR15 | `analyticsClient.test.js` (guest); `AnalyticsClient.test.js` (mobile) | Đạt 09/11 |
| TC-12-03 | Heartbeat đầu; liên tục; cách 29:59 và đúng 30:00; nhiều request đồng thời | Lượt đầu và lượt sau ≥ 30 phút; heartbeat liên tục không thêm lượt; đồng thời chỉ một lượt (A3) | BR14 | `test_analytics.py::test_first_heartbeat_creates_session_and_one_visit`, `::test_continuous_heartbeats_do_not_add_visits`, `::test_gap_just_under_30_minutes_is_same_visit`, `::test_gap_of_exactly_30_minutes_starts_new_visit`, `::test_concurrent_heartbeats_create_single_visit`; `test_analytics_integration.py::test_main_routes_respect_exact_30_minute_gap`, `::test_concurrent_requests_deduplicate…` | Đạt 09/11 |
| TC-12-04 | Rút đồng ý; rút lặp lại; heartbeat đến muộn sau khi rút | Dừng gửi ngay; tách mã khỏi lượt cũ, loại khỏi số đang hoạt động; idempotent; heartbeat muộn trả 409 (A2) | BR18 | `test_analytics.py::test_revoke_*`, `::test_heartbeat_after_revoke_does_not_reactivate`; `integration.spec.js › "one real API session integrates map, TTS… and consent withdrawal"` | Đạt 09/11 |
| TC-12-05 | Rút khi mất mạng; mở lại app; server lỗi | Dừng ngay, giữ mã chờ, gửi lại khi có mạng/mở lại/mỗi 30 s; không cho đồng ý lại khi còn chờ (E1) | BR18 | `integration.spec.js › "offline withdrawal persists, retries after reopening…"`; `analyticsClient.test.js`; `AnalyticsClient.test.js` | Đạt 09/11 |
| TC-12-06 | Hai tab cùng nguồn | Dùng chung mã; rút ở tab này thì tab kia dừng ngay | BR15 | `integration.spec.js › "two tabs share the ID, synchronize withdrawal…"` | Đạt 09/11 |
| TC-12-07 | UUID sai phiên bản/biến thể, chuỗi sai | 422, không ghi | BR13 | `test_analytics_integration.py::test_invalid_uuid_version_and_variant_are_422_without_writes`; `test_analytics.py::test_invalid_session_id_rejected` | Đạt 09/11 |
| TC-12-08 | Mobile với API thật: mở lần đầu, đồng ý, rút, rút khi mất mạng, xuống nền | Như TC-12-01..05 trên điện thoại; Dashboard cập nhật trong 30 s | BR13–BR18 | FT-17 → FT-21 | Chưa thử (lượt 07/11 dùng mock) |

## Yêu cầu phi chức năng

| Mã | Tình huống | Kết quả mong đợi | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- |
| TC-NFR01 | Băm mật khẩu, bảo vệ phiên, giới hạn đăng nhập, secret ngoài mã nguồn, HTTPS | PBKDF2-SHA256 600.000 vòng; token chỉ lưu hash; 429 khi đoán nhiều; mật khẩu Admin nhập lúc seed qua lời nhắc ẩn, không ghi trong mã | TC-05-01..06; `test_database.py::test_seed_repeat_preserves_edits_and_password` | Đạt 09/11, trừ HTTPS: chưa triển khai |
| TC-NFR02 | Bản đồ/GPS/TTS lỗi | Báo rõ, vẫn dùng danh sách và đọc văn bản | TC-01-05, TC-02-04, TC-03-02, TC-04-05 | Đạt 09/11 |
| TC-NFR03 | Ràng buộc dữ liệu | CHECK, UNIQUE (poi_id, locale), RESTRICT/CASCADE; validation client và backend | `test_database.py::test_constraints_and_delete_rules`; TC-07-02, TC-08-01; TC-DB-01..07 | Đạt 09/11 |
| TC-NFR04 | Khung 375, 768, 1440 px, giao diện VI/EN | Không tràn ngang; có loading, rỗng, lỗi | `acceptance.spec.js › "NFR04 guest list/map/detail/privacy and Admin fit …px…"` (3 khung); `map.spec.js › "…narrow viewport has no overflow"` | Đạt 09/11 |
| TC-NFR05 | Dữ liệu demo | ≥ 5 địa điểm, 2 danh mục, mỗi địa điểm ≥ 1 bài, ít nhất một địa điểm 2 ngôn ngữ | `test_enrich_demo_content.py::test_content_covers_every_seeded_place_in_both_languages`; `test_add_demo_images.py`; DB chính 09/11: 5 POI công khai, 2 danh mục, 10 bài vi+en, 5 ảnh | Đạt 09/11 |
| TC-NFR06 | Cài đặt, cấu hình DB, sao lưu/phục hồi | Hướng dẫn chạy được; snapshot giữ dữ liệu và phiên bản | `test_backup_db.py` (3 ca); `test_start_demo.py` (4 ca); [RUNNING.md](../../RUNNING.md) | Đạt 09/11; cài mới trên máy khác chưa thử |
| TC-NFR07 | Ghi kết quả luồng chính, ngoại lệ, phân quyền, thống kê; thử GPS/TTS thật | Có ca và kết quả cho từng nhóm | Tài liệu này; [phiếu thực địa](../mobile/testing/mobile-field-test.md) | Một phần: ca thiết bị còn thiếu minh chứng |
| TC-NFR08 | 20 request danh sách liên tiếp | 95% dưới 3 giây | `tools/verify_handoff.py` | Đạt 06/11: 20/20 dưới 3 giây (máy phát triển) |

## Dữ liệu và hạ tầng

| Mã | Tình huống | Kết quả mong đợi | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- |
| TC-DB-01 | Khởi tạo DB mới qua 001 → 005 | `user_version = 5`, bảng analytics có CHECK/FK/chỉ mục; API khởi động và phục vụ danh mục song ngữ | `test_analytics_migration.py::test_new_database_has_version_and_constraints`; `test_database.py::test_init_tables_and_refusal_preserves_existing_data`; `test_startup.py::test_current_database_starts_and_serves_categories` | Đạt (chạy lại 14/11) |
| TC-DB-02 | DB theo 001 có dữ liệu: kiểm tra rồi nâng cấp kèm backup | `--check` không đổi tệp; nâng cấp giữ dữ liệu; backup giữ schema cũ | `test_analytics_migration.py::test_upgrade_preserves_rows_backup_and_foreign_keys`, `::test_check_and_repeated_upgrade_preserve_data` | Đạt 09/11 |
| TC-DB-03 | Schema analytics riêng cũ, tên chỉ mục cũ | Giữ phiên đã rút và session_id NULL; tạo tên chỉ mục chuẩn | `test_analytics_migration.py::test_upgrade_legacy_standalone_schema_and_index_names` | Đạt 09/11 |
| TC-DB-04 | UUID/thời gian/consent sai hoặc FK mồ côi | Dừng, rollback schema và dữ liệu, bật lại FK | `test_analytics_migration.py::test_invalid_old_data_rolls_back_schema_and_rows` | Đạt 09/11 |
| TC-DB-05 | Thiếu backup, backup trùng, DB thiếu, chỉ mục tùy biến | Từ chối; không tạo DB nguồn, không xóa thành phần tùy biến | `test_analytics_migration.py::test_backup_required_and_no_overwrite_or_missing_creation`, `::test_custom_dependencies_are_not_silently_dropped` | Đạt 09/11 |
| TC-DB-06 | `CREATE TABLE IF NOT EXISTS` trên bảng cũ | Bảng cũ vẫn nhận dữ liệu sai; migration kiểm tra và từ chối | `test_analytics_migration.py::test_create_if_not_exists_cannot_upgrade_old_constraints` | Đạt 09/11 |
| TC-DB-07 | Migration 003 song ngữ danh mục | Đọc SQL từ tệp 003; giữ dữ liệu và quan hệ; từ chối áp dụng lặp hoặc khi có vi phạm FK | `test_category_preparation.py` (5 ca) | Đạt 09/11 |
| TC-DB-08 | API khởi động với DB thiếu, schema cũ, analytics chưa nâng cấp | Từ chối, không tạo/sửa DB | `test_startup.py` (4 ca) | Đạt 09/11 |
| TC-DB-10 | Migration 004 trên DB schema 2 | `--check` không đổi tệp; áp dụng giữ dữ liệu, `user_version = 4`, backup giữ schema cũ; từ chối chạy lặp, thiếu backup hoặc sai phiên bản; API từ chối DB schema 2 | `test_poi_images.py` nhóm `Migration004Tests` (3 ca) | Đạt 09/11 |
| TC-DB-09 | Seed và nội dung demo chạy lặp | Không ghi đè dữ liệu/mật khẩu nhóm đã sửa; xung đột thì rollback toàn bộ | `test_database.py::test_seed_*`, `::test_collision_rolls_back_whole_seed`; `test_enrich_demo_content.py`; `test_add_demo_images.py` | Đạt 09/11 |
| TC-DB-11 | Migration 005 trên DB schema 4 | `--check` không đổi tệp; áp dụng giữ dữ liệu, `user_version = 5`, backup giữ schema 4; từ chối chạy lặp, thiếu backup, sai phiên bản; CHECK và `RESTRICT` hoạt động; API từ chối DB schema 4 | `test_audit_log.py` nhóm `Migration005Tests` (4 ca) | Đạt 12/11 |

## Phần mở rộng C: nhật ký thao tác Admin

| Mã | Tình huống | Kết quả mong đợi | Quy tắc | Bằng chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-AUD-01 | Thực hiện đủ 15 loại thao tác (đăng nhập/xuất, danh mục, địa điểm, công bố/ẩn, ảnh, bài thuyết minh) | Mỗi thao tác đúng một dòng, đúng `admin_id`, `action`, `target_*`, `summary`; xóa địa điểm kèm bài chỉ một dòng; dòng còn sau khi đối tượng bị xóa | BR09 | `test_audit_log.py::EveryActionIsLoggedOnceTests` | Đạt 12/11 |
| TC-AUD-02 | 26 yêu cầu bị từ chối (401, 404, 409, 413, 415, 422), đăng nhập sai, đăng xuất lần hai, các lệnh đọc | Không dòng nào được ghi | BR09 | `::RejectedActionsAreNotLoggedTests` | Đạt 12/11 |
| TC-AUD-03 | Ghi log lỗi giữa chừng (tạo danh mục, địa điểm, công bố, xóa, đăng nhập) | Trả 500, thay đổi bị rollback, không có phiên mới; `record` không tự commit | NFR03 | `::AtomicityTests` | Đạt 12/11 |
| TC-AUD-04 | Mật khẩu, token, tiêu đề và nội dung bài; tên nhiều dòng; summary quá dài; action lạ | Không lưu bí mật; summary một dòng ≤ 200; action lạ bị từ chối | BR10 | `::PrivacyAndSummaryTests` | Đạt 12/11 |
| TC-AUD-05 | `GET /admin/audit-log`: không/sai/hết phiên, thứ tự, `limit` mặc định/1/200/0/201/abc, nhật ký rỗng, hai Admin | 401 khi thiếu phiên; mới nhất trước; 422 ngoài 1–200; đúng tên người thực hiện | BR09 | `::AuditLogApiTests`, `::EveryActionIsLoggedOnceTests::test_two_admins_are_told_apart` | Đạt 12/11 |
| TC-AUD-06 | Tab Nhật ký trong Admin | Thấy thao tác vừa làm đầu bảng, thao tác trùng bị 409 không hiện, tải lại vẫn ở tab | UC05–UC09 | `admin.spec.js › "Activity log tab lists…"` | Đạt 12/11 (job e2e Playwright/Edge của CI trên `99e3d88`, chạy toàn bộ thư mục `tests`) |

## Phần mở rộng B: Gần tôi

Đặc tả ở [b-near-me.md](../project/b-near-me.md). Các tệp ghi "(PR #7)" nằm trên nhánh `feat/b-near-me-mobile`, chỉ có trên `main` sau khi PR #7 được merge.

| Mã | Tình huống | Kết quả mong đợi | Quy tắc | Kiểm chứng | Kết quả |
| --- | --- | --- | --- | --- | --- |
| TC-NEAR-01 | Sắp danh sách theo khoảng cách: nhiều địa điểm, bằng khoảng cách, thiếu hoặc hỏng tọa độ, vị trí khách không hợp lệ, danh sách rỗng | Tăng dần theo haversine; bằng nhau giữ thứ tự cũ; thiếu tọa độ xếp cuối, không có khoảng cách; vị trí sai thì giữ nguyên thứ tự; không sửa mảng gốc | — | `nearMe.test.js` (guest) và `places/nearMe.test.js` (mobile): các ca "sắp xếp…", "bằng khoảng cách…", "thiếu hoặc hỏng tọa độ…", "vị trí khách không hợp lệ…" | Đạt 14/11 |
| TC-NEAR-02 | Định dạng khoảng cách: < 10 m, 349 m, 1.234 m, 12 km; giao diện VI và EN; giá trị âm hoặc không phải số | "< 10 m", "~350 m", "1,2 km" (VI) / "1.2 km" (EN), "12 km"; giá trị sai cho chuỗi rỗng | — | `nearMe.test.js › "formatDistance: …"` (guest, mobile) | Đạt 14/11 |
| TC-NEAR-03 | Web: cho phép vị trí, bấm Gần tôi; bấm lại để tắt; kết hợp với tìm kiếm; giao diện tiếng Anh | Sắp theo khoảng cách và hiện khoảng cách; tắt thì về thứ tự cũ; chỉ còn kết quả khớp tìm kiếm và vẫn sắp; nhãn và câu đọc tiếng Anh | BR02 | `nearMe.spec.js` nhóm "đã cho phép vị trí" (PR #7) | Đạt CI PR #7 |
| TC-NEAR-04 | Từ chối quyền vị trí; trình duyệt không hỗ trợ; trang không an toàn (HTTP qua IP LAN); hết giờ; mobile tắt dịch vụ vị trí | Báo đúng lý do; giữ thứ tự cũ; không hiện khoảng cách | — | `nearMe.test.js › "requestPosition: …"` (guest); `nearMe.spec.js` nhóm "chưa cho phép vị trí", `nearMePosition.test.js`, `ExploreScreen.nearMe.test.js › "từ chối quyền…"`, `"dịch vụ vị trí tắt…"` (PR #7) | Đạt 14/11 (guest); Đạt CI PR #7 (mobile, Playwright) |
| TC-NEAR-05 | Quyền riêng tư: bật Gần tôi rồi theo dõi mọi request và bộ nhớ trình duyệt/máy | Không request nào chứa tọa độ; không ghi tọa độ vào localStorage/AsyncStorage; tọa độ chỉ nằm trong bộ nhớ của màn hình | BR07, NFR11 | `nearMe.test.js › "BR07: …"` (guest), `places/nearMe.test.js › "mã "Gần tôi" không gọi mạng…"` (mobile); `nearMe.spec.js` ca đầu, `ExploreScreen.nearMe.test.js › "BR07: …"` (PR #7) | Đạt 14/11; Đạt CI PR #7 |
| TC-NEAR-06 | Mobile: mở Khám phá chưa bấm Gần tôi; bấm Gần tôi; bấm lại | Chưa bấm thì không hỏi quyền, giữ thứ tự API; bấm thì sắp và hiện khoảng cách; bấm lại thì về thứ tự cũ | BR07 | `ExploreScreen.nearMe.test.js` (PR #7) | Đạt CI PR #7 |
| TC-NEAR-07 | Điện thoại thật với API thật: cho phép, từ chối, tắt GPS, đi bộ đổi vị trí | Như TC-NEAR-03/04/06 trên thiết bị; thứ tự đổi theo vị trí thật | BR07 | FT-24, FT-25, FT-26 | Chưa thử |
