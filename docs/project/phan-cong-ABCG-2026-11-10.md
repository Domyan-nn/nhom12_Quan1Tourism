# Phân công phần mở rộng A, B, C, G — 3 ngày (10/11 → 12/11/2026)

Người kiểm tra tiến độ: **Domyan-nn**, mỗi tối lúc 21:00 theo [bảng theo dõi](#5-bảng-theo-dõi-hằng-ngày). Mỗi phần mở rộng đi trọn vòng: yêu cầu → thiết kế → mã → kiểm thử → tài liệu, trên nhánh riêng, merge vào `main` qua PR có người khác review.

## 1. Ai làm gì

| Người | Phần chính | Lý do chọn | Ngày 3 làm thêm |
| --- | --- | --- | --- |
| **Domyan-nn** | **A. Upload ảnh và ghi công ảnh** (backend, migration 004, Admin, hiển thị ở web/mobile) — làm cùng Claude | Phụ trách tích hợp; phần A đụng nhiều nơi nhất | **G. Chạy bản build bằng một lệnh** (cùng sửa `backend/app/main.py` như A nên để một người làm, tránh xung đột); merge cuối |
| **LeeNaimThwuan** | **B. "Gần tôi"**: sắp xếp danh sách theo khoảng cách trên web khách và mobile | Đã làm mobile (UC03, UC12 mobile, marker bản đồ) và guest web | Thử B và phần hiển thị ghi công ảnh của A trên điện thoại thật, quay video làm minh chứng |
| **qannee** | **C. Nhật ký thao tác Admin** (migration 005, ghi log ở các route quản trị, tab Nhật ký) | Đã làm backend thống kê UC12 và hợp đồng API | Review PR của B; bổ sung ca kiểm thử và truy vết cho C |

## 2. Đặc tả ngắn và tiêu chí xong

### A. Upload ảnh và ghi công ảnh — `feat/a-image-upload`

- Admin tải ảnh JPG/PNG/WebP ≤ 2 MB cho một địa điểm đã lưu; thay ảnh cũ thì xóa tệp cũ; có nút Xóa ảnh. Vẫn cho nhập URL HTTP(S).
- Trường **Ghi công ảnh** (tác giả, giấy phép, nguồn; ≤ 300 ký tự) lưu ở cột `pois.image_credit` (migration **004**, `user_version = 4`).
- Ảnh phục vụ qua `/api/media/...` (đi qua proxy `/api` sẵn có). Trang chi tiết web và mobile hiện dòng ghi công dưới ảnh.
- Kiểm tra ở backend: loại tệp theo cả `Content-Type` và chữ ký tệp, dung lượng, quyền Admin.
- Xong khi: test backend cho upload/thay/xóa/từ chối tệp sai; Playwright tải ảnh trong Admin và thấy ghi công ở trang khách; DB chính đã migrate có sao lưu; API_CONTRACT, ca kiểm thử TC-07-06, ma trận truy vết cập nhật.

### B. "Gần tôi" — `feat/b-near-me`

- Nút **Gần tôi** ở màn Khám phá (web và mobile). Khách cho phép vị trí thì danh sách sắp theo khoảng cách và hiện "~350 m" / "1,2 km"; từ chối hoặc lỗi thì giữ thứ tự cũ và báo lý do.
- Chỉ tính trên máy khách bằng công thức haversine; **không gửi tọa độ lên server** (BR07). Mobile dùng lại `features/location/geo.js`.
- Xong khi: test đơn vị hàm sắp xếp (Node test cho web, Jest cho mobile); Playwright cấp vị trí giả và kiểm thứ tự, kiểm không request nào chứa tọa độ; ca thực địa trên điện thoại có video.

### C. Nhật ký thao tác Admin — `feat/c-audit-log`

- Bảng `admin_audit_log(id, admin_id, action, target_type, target_id, summary, created_at)` (migration **005**, `user_version = 5`, làm sau khi A đã merge).
- Ghi một dòng khi thao tác **thành công**: đăng nhập, đăng xuất, thêm/sửa/xóa danh mục, địa điểm, bài thuyết minh, công bố, ẩn, tải/xóa ảnh. Thao tác bị từ chối (401/409/422) không ghi. Không ghi mật khẩu hay nội dung bài.
- `GET /api/v1/admin/audit-log?limit=50` (mới nhất trước, yêu cầu phiên Admin); tab **Nhật ký** trong Admin.
- Xong khi: test mỗi loại thao tác ghi đúng một dòng đúng người; thao tác lỗi không ghi; route yêu cầu đăng nhập; Playwright mở tab Nhật ký thấy thao tác vừa làm.

### G. Chạy bản build bằng một lệnh — `feat/g-serve-build`

- Build hai web (`admin-web` với `--base /admin/`), FastAPI phục vụ guest ở `/`, admin ở `/admin/`, có fallback cho route SPA; chỉ bật khi đặt biến `SAIGON_SERVE_WEB=1`.
- Script `scripts/start-build.ps1`: sao lưu DB → build → chạy uvicorn cổng 8000. RUNNING.md có mục mới.
- Xong khi: test `TestClient` cho `/`, `/poi/abc` (trả index), `/admin/`, `/api/v1/health`; thử trên một máy khác theo RUNNING.

## 3. Lịch 3 ngày

| | Ngày 1 — Thứ Ba 10/11 | Ngày 2 — Thứ Tư 11/11 | Ngày 3 — Thứ Năm 12/11 |
| --- | --- | --- | --- |
| **Domyan-nn** | A: migration 004, API upload/xóa ảnh, test backend | A: Admin upload, hiển thị ghi công web/mobile, Playwright; mở PR A, merge sau review | G: phục vụ bản build, script, test; merge B, C, G; chạy lại toàn bộ test |
| **LeeNaimThwuan** | B: hàm sắp xếp + test đơn vị (web, mobile); nút Gần tôi trên web | B: mobile + Playwright; mở PR B | Thử B và ghi công ảnh (A) trên điện thoại, quay video; sửa góp ý review |
| **qannee** | C: thiết kế bảng, hàm ghi log, gắn vào route danh mục và auth, test | C: gắn vào route địa điểm/bài/công bố; API đọc log; tab Nhật ký | Rebase C lên A (migration 005), thêm log cho tải/xóa ảnh, mở PR C; review PR B |

**Thứ tự merge:** A (trưa ngày 2) → B (tối ngày 2) → C (sáng ngày 3) → G (chiều ngày 3). Đóng băng tính năng cuối ngày 3.

## 4. Quy ước tránh xung đột

| Điểm nóng | Ai sửa | Cách tránh |
| --- | --- | --- |
| `backend/app/main.py` | A (mount `/api/media`), G (phục vụ bản build) | Cùng một người (Domyan-nn) |
| `backend/app/api/routes/admin_pois.py` | A (ảnh), C (ghi log) | C gọi một hàm `audit.record(...)` ở cuối mỗi route, rebase sau khi A merge |
| Migration | A = `004`, C = `005` | Không đổi số; C cập nhật kiểm tra `user_version` lên 5 |
| `apps/admin-web/src/features/admin/auth/Admin.jsx` | C (thêm tab) | Chỉ thêm một mục vào `TABS` và một nhánh render |
| `ExploreScreen.js`, `ExplorePage.jsx` | B | Không ai khác sửa trong 3 ngày |

Trước khi mở PR: chạy đủ các lệnh ở [test-plan.md mục 7](../testing/test-plan.md#7-lệnh-chạy), dán kết quả vào mô tả PR. Không commit thẳng lên `main`.

## 5. Bảng theo dõi hằng ngày

Mỗi tối người phụ trách ghi link PR/commit và tình trạng; Domyan-nn đánh giá cột cuối.

| Ngày | Người | Mục tiêu cuối ngày | Bằng chứng (PR, commit, ảnh) | Tự đánh giá | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| 10/11 | Domyan-nn | Migration 004 + API upload có test đạt | | | ☐ |
| 10/11 | LeeNaimThwuan | Hàm sắp xếp + test; nút Gần tôi trên web | | | ☐ |
| 10/11 | qannee | Bảng log + ghi log danh mục/auth + test | | | ☐ |
| 11/11 | Domyan-nn | PR A mở, Playwright đạt, đã merge | | | ☐ |
| 11/11 | LeeNaimThwuan | PR B mở, mobile + Playwright đạt | | | ☐ |
| 11/11 | qannee | Log đủ các route, API + tab Nhật ký | | | ☐ |
| 12/11 | Domyan-nn | PR G merge; B, C đã merge; toàn bộ test đạt | | | ☐ |
| 12/11 | LeeNaimThwuan | Video thử trên điện thoại cho B và ghi công ảnh | | | ☐ |
| 12/11 | qannee | PR C merge; ca kiểm thử và truy vết cho C | | | ☐ |

Trễ quá nửa ngày so với mục tiêu: báo trong nhóm ngay, cắt bớt phạm vi trước (ví dụ C bỏ log đăng nhập/đăng xuất, G bỏ script) thay vì kéo dài lịch.
