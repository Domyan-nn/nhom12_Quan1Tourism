# Phân công hoàn thiện — 13/11 → bảo vệ (dự kiến thứ Hai 16/11/2026)

Thay cho [bảng phân công A, B, C, G](phan-cong-ABCG-2026-11-10.md), đã hết hạn ngày 12/11. Lập ngày 13/11 theo trạng thái `main` `99e3d88`. Ngày bảo vệ chưa chốt; nếu khác 16/11 thì dời các mốc theo đúng số ngày.

Tên trong tài liệu cũ: **Nguyên = Domyan-nn**, **An = qannee**, **Thuận = LeeNaimThwuan**. Người kiểm tra tiến độ: Domyan-nn, mỗi tối 21:00, theo [bảng theo dõi](#6-bảng-theo-dõi-hằng-ngày).

## Trạng thái đầu vào (13/11, 09:35)

| Hạng mục | Trạng thái |
| --- | --- |
| A. Upload ảnh và ghi công ảnh | Xong trên `main`; còn thiếu video thử trên điện thoại |
| B. Gần tôi | Web và hàm sắp xếp đã merge (PR #4); **thiếu** nút trên mobile, Playwright, ca kiểm thử và truy vết, video |
| C. Nhật ký Admin | Xong trên `main` (CI xanh 5/5 job, backend 132/132); **push thẳng, không qua PR**; DB chính chưa migrate 005 |
| G. Chạy bản build bằng một lệnh | Chưa bắt đầu; nhóm quyết định vẫn làm, trong ngày 13/11 |
| Minh chứng thiết bị FT-1..23 | Chưa có; `docs/testing/evidence/` trống |
| PRD 1.2, báo cáo cuối kỳ, slide | Chưa bắt đầu |
| Branch protection, issue | Chưa bật, chưa có issue |

## 0. Việc chặn — xong trước 12:00 ngày 13/11

| # | Việc | Người | Xong khi |
| --- | --- | --- | --- |
| 0.1 | Migrate DB chính lên schema 5: dừng API → `migrate_005_admin_audit_log.py --check` → chạy với `--backup` (lệnh ở [RUNNING.md](../../RUNNING.md)) | Domyan-nn | `start-system.ps1` bật được; `/api/v1/admin/audit-log` trả 200 |
| 0.2 | Mỗi máy dùng để demo hoặc thử điện thoại tự migrate DB của máy mình | An, Thuận | Như 0.1, trên máy mình |
| 0.3 | Bật branch protection cho `main`: bắt buộc PR, 1 người duyệt, CI `backend`, `guest-web`, `admin-web`, `mobile` xanh | Domyan-nn | Push thẳng lên `main` bị GitHub từ chối |
| 0.4 | Sửa email commit: `git config user.email` bằng email noreply **thật** của mình (GitHub → Settings → Emails), không chép nguyên chuỗi mẫu trong CONTRIBUTING | An | Commit mới hiện ảnh đại diện và tên tài khoản trên GitHub |
| 0.5 | Đồng bộ `main` local: `git fetch`, rồi `git switch main` và `git reset --hard origin/main` (đã commit hết việc dở trước) | Cả ba | `git status` báo `up to date with 'origin/main'` |

Từ nay **không push thẳng lên `main`**: mọi thay đổi đi qua nhánh, PR và một người khác duyệt (theo [CONTRIBUTING](../../CONTRIBUTING.md)).

## 1. Ai làm gì

| | Domyan-nn (Nguyên) | qannee (An) | LeeNaimThwuan (Thuận) |
| --- | --- | --- | --- |
| **Mã nguồn** (hết 13/11) | **G**: FastAPI phục vụ bản build guest `/` và admin `/admin/`, bật bằng `SAIGON_SERVE_WEB=1`; `scripts/start-build.ps1`; test `TestClient`; mục mới trong RUNNING | Không viết tính năng mới. Chuyển nội dung C cho PRD 1.2 (bảng thứ 8, endpoint, quyết định thiết kế) | **B mobile**: nút Gần tôi ở `ExploreScreen` (expo-location), từ chối quyền thì giữ thứ tự cũ; Jest; **Playwright B** (vị trí giả, kiểm thứ tự, kiểm không request nào chứa tọa độ) |
| **Tài liệu kỹ thuật** | Merge PR #3 (sửa "tạm gác"); cập nhật [test-results.md](../testing/test-results.md) cho B, C, G sau lượt chạy cuối | Thêm C vào [test-results.md](../testing/test-results.md) (số liệu 132/132, đột biến đã thử) | Thêm ca kiểm thử B vào [test-cases.md](../testing/test-cases.md) và dòng B vào [traceability-matrix.md](../testing/traceability-matrix.md) |
| **Minh chứng** (14/11) | Chạy lại toàn bộ bộ test và ghi số; gắn tag `v1.0` sau khi chốt | **Cài mới toàn hệ thống trên máy của An** theo RUNNING (NFR06), thử cả `start-build.ps1` của G; đo lại NFR08 | **FT-1..23 trên điện thoại với API thật**; quay video: B, ghi công ảnh (A), GPS tự phát (UC04), đồng ý/rút thống kê (UC12); lưu vào `docs/testing/evidence/` |
| **PRD và báo cáo** (14–15/11) | **PRD 1.2** (bỏ "chưa có tải ảnh lên", thêm A/B/C/G và bảng `admin_audit_log`); khung báo cáo; chương tổng quan, kiến trúc, quản lý dự án và CI; ghép bản cuối | Chương thống kê UC10–UC12 và C; chương kiểm thử (kế hoạch, ca, truy vết, số liệu) | Chương mobile (UC01–UC04, GPS, TTS, B) và kiểm thử thực địa; cập nhật sơ đồ `docs/mobile/diagrams` |
| **Slide** (15/11) | Mở đầu, kiến trúc, quy trình, kết luận | Thống kê, C, kiểm thử | Mobile, demo thực địa |
| **Review** | PR B (mobile + Playwright) | PR G; đọc chéo chương mobile | PR tài liệu của An; đọc chéo chương kiến trúc |

## 2. Lịch theo ngày

| Ngày | Domyan-nn | qannee | LeeNaimThwuan |
| --- | --- | --- | --- |
| **Thứ Sáu 13/11** | Sáng: việc chặn 0.1, 0.3, 0.5; merge PR #3. Chiều–tối: G, mở PR G | Sáng: 0.2, 0.4, 0.5. Chiều: test-results cho C; chuyển nội dung C cho PRD; review PR G khi mở | Sáng: 0.2, 0.5. Cả ngày: B mobile + Playwright + ca kiểm thử và truy vết B, mở PR B |
| **Thứ Bảy 14/11** | Sáng: merge B, G; chạy lại toàn bộ test; cập nhật test-results. Chiều: PRD 1.2; khung báo cáo gửi nhóm | Sáng: cài mới trên máy An, thử G; NFR08. Chiều: viết chương thống kê, C, kiểm thử | Sáng: FT-1..23 và quay video. Chiều: điền phiếu thực địa, viết chương mobile |
| **Chủ Nhật 15/11** | Sáng: ghép báo cáo, bảng đóng góp; tag `v1.0`. Chiều: slide | Sáng: sửa chương theo góp ý; slide phần mình | Sáng: sửa chương theo góp ý; slide phần mình; sơ đồ mobile |
| **Tối 15/11** | **Cả nhóm**: tổng duyệt demo từ máy sạch (1 giờ) + "giải thích ngược", mỗi người trình bày phần của người khác 5 phút (1 giờ) | | |
| **Thứ Hai 16/11** | Bảo vệ (dự kiến) | | |

## 3. Quy tắc cắt phạm vi

Đến 21:00 ngày 13/11, phần nào chưa có PR với CI xanh thì cắt, ghi vào báo cáo là "hướng phát triển", không kéo sang ngày minh chứng:

- **G** chưa xong: bỏ G, giữ cách chạy hiện tại (`start-system.ps1`).
- **B mobile** chưa xong: giữ B trên web, phần mobile thành hướng phát triển. Playwright cho B trên web vẫn phải có.
- Minh chứng thiết bị không kịp đủ 23 ca: ưu tiên theo thứ tự UC04 tự phát → UC12 rút đồng ý → B → ghi công ảnh → UC01–UC03. Ca chưa thử ghi "chưa thử", không ghi "đạt".

## 4. Sản phẩm nộp

| Sản phẩm | Người chịu trách nhiệm | Hạn | Nơi lưu |
| --- | --- | --- | --- |
| Mã nguồn, tag `v1.0`, CI xanh | Domyan-nn | 15/11 sáng | GitHub |
| PRD 1.2 (.docx) | Domyan-nn | 14/11 tối | Gốc repo, ghi phiên bản ở [requirements/](../requirements/README.md) |
| Báo cáo cuối kỳ (.docx và .pdf) | Domyan-nn ghép, mỗi người viết chương mình | 15/11 sáng | `docs/final-report/` |
| Slide | Cả nhóm, Domyan-nn ghép | 15/11 chiều | `docs/final-report/` |
| Video và ảnh minh chứng | LeeNaimThwuan | 14/11 tối | `docs/testing/evidence/` (video lớn để Drive, ghi link) |
| Kết quả kiểm thử cuối | Domyan-nn | 14/11 | [test-results.md](../testing/test-results.md) |
| Bảng đóng góp thành viên | Domyan-nn soạn, từng người xác nhận | 15/11 | Trong báo cáo |

## 5. Bảng đóng góp (nháp, mỗi người tự sửa và xác nhận)

Soạn từ lịch sử Git và các báo cáo tích hợp; chỉ là điểm xuất phát.

| Thành viên | Phần chính | Nguồn đối chiếu |
| --- | --- | --- |
| Domyan-nn (Nguyên) | Điều phối, tích hợp; backend xác thực, danh mục, địa điểm, thuyết minh, công bố/ẩn (WBS 01–06); Admin web; phần mở rộng A, G; CI; tài liệu kiểm thử P2, PRD | Commit trên `main`, PR #2 |
| qannee (An) | Khung guest-web, hợp đồng API ban đầu; thống kê UC10–UC12 (backend, Dashboard, đồng ý/rút trên web); phần mở rộng C | Commit 01/11, 03/11, 04/11, 12/11 (commit 12/11 chưa gắn tài khoản GitHub do sai email) |
| LeeNaimThwuan (Thuận) | Ứng dụng mobile: tra cứu, bản đồ, TTS, GPS tự phát, UC12 mobile; nội dung database; phần mở rộng B; kiểm thử thực địa | Commit 01/11–10/11, PR #1, #4 |

Ghi trung thực việc dùng công cụ AI hỗ trợ viết mã và tài liệu, kèm cách nhóm kiểm soát: review, chạy test, tự giải thích được từng phần.

## 6. Bảng theo dõi hằng ngày

Mỗi tối người phụ trách điền bằng chứng (link PR, commit, ảnh); Domyan-nn điền cột cuối.

| Ngày | Người | Mục tiêu cuối ngày | Bằng chứng | Tự đánh giá | Kiểm tra |
| --- | --- | --- | --- | --- | --- |
| 13/11 | Domyan-nn | Việc chặn 0.1, 0.3, 0.5 xong; PR #3 merge; PR G mở, CI xanh | | | ☐ |
| 13/11 | qannee | 0.2, 0.4, 0.5 xong; C có trong test-results; đã review PR G | | | ☐ |
| 13/11 | LeeNaimThwuan | 0.2, 0.5 xong; PR B mobile + Playwright mở, CI xanh | | | ☐ |
| 14/11 | Domyan-nn | B, G đã merge; toàn bộ test chạy lại đạt; PRD 1.2 xong; khung báo cáo đã gửi | | | ☐ |
| 14/11 | qannee | Cài mới trên máy khác đạt (hoặc ghi rõ lỗi); chương thống kê, C, kiểm thử có bản nháp | | | ☐ |
| 14/11 | LeeNaimThwuan | FT-1..23 có kết quả; video trong evidence; chương mobile có bản nháp | | | ☐ |
| 15/11 | Domyan-nn | Báo cáo ghép xong; tag `v1.0`; slide xong | | | ☐ |
| 15/11 | qannee | Chương và slide phần mình đã sửa theo góp ý | | | ☐ |
| 15/11 | LeeNaimThwuan | Chương, slide, sơ đồ mobile đã sửa theo góp ý | | | ☐ |
| 15/11 | Cả nhóm | Tổng duyệt demo đạt; buổi giải thích ngược xong | | | ☐ |
