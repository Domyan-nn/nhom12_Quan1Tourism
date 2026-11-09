# Quy ước đóng góp

Áp dụng cho cả nhóm từ 10/11/2026. Mục tiêu: `main` lúc nào cũng chạy được, mỗi thay đổi đều có người khác xem và có CI kiểm tra, lịch sử git đọc lại được khi viết báo cáo.

## 1. Nhánh

- `main` luôn chạy được và đã qua CI. Không push thẳng lên `main`; mọi thay đổi đi qua pull request.
- Đặt tên nhánh theo loại việc: `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`. Ví dụ: `feat/b-near-me`, `fix/admin-session-expiry`.
- Tách nhánh từ `main` mới nhất; trước khi mở PR cập nhật bằng `git pull --rebase origin main`.
- Xóa nhánh (cả trên GitHub) sau khi merge.

## 2. Commit

- Mỗi commit làm một việc, và sau mỗi commit mã vẫn build và test được.
- Dòng đầu theo dạng `<loại>: <mô tả ngắn>`, tối đa khoảng 72 ký tự, tiếng Việt có dấu (hoặc tiếng Anh, thống nhất trong một PR). Loại: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- Thân commit (nếu cần) nói **vì sao** đổi, mã yêu cầu liên quan (F, UC, BR) và issue (`Refs #12`).

```text
feat: sắp xếp danh sách theo khoảng cách khi khách cho phép vị trí

Tính bằng haversine trên máy khách, không gửi tọa độ lên server (BR07).
Phần mở rộng B, UC01. Refs #12
```

- **Không** upload tệp qua giao diện web của GitHub: cách này bỏ qua test trên máy (lỗi ngày 08/11 đến từ đây).
- **Không** commit DB, `backups/`, `storage/` (ảnh tải lên), `.env`, `dist/`, `node_modules/`, ảnh chụp có dữ liệu thật. `.gitignore` đã chặn các mục này; đừng dùng `git add -f`.
- Email commit: dùng email noreply của GitHub để không lộ email cá nhân trên repo công khai (GitHub → Settings → Emails, bật "Keep my email addresses private"):

```text
git config user.email "<id>+<tên-github>@users.noreply.github.com"
```

- Commit có trợ giúp của công cụ AI giữ dòng `Co-Authored-By` tương ứng; nêu việc dùng AI trong báo cáo nếu môn học yêu cầu.

## 3. Pull request

1. Tạo issue cho việc (mẫu *Chức năng* hoặc *Lỗi*), gán người làm.
2. Mở PR vào `main` theo mẫu có sẵn, ghi `Closes #n` để issue tự đóng khi merge.
3. CI chạy mỗi lần push lên bất kỳ nhánh nào; PR hiện kết quả của commit mới nhất và phải xanh. Các job bắt buộc: `backend`, `guest-web`, `admin-web`, `mobile`. Job `e2e (Playwright, Edge)` chạy khi ba job đầu đạt; PR đổi web hoặc API phải có e2e xanh.
4. Ít nhất **một thành viên khác** duyệt (Approve). Người viết không tự merge khi chưa có duyệt.
5. Merge bằng **Squash and merge**; tiêu đề commit trên `main` theo dạng ở mục 2.

Người review kiểm tra: đúng yêu cầu và tiêu chí xong; có test cho luồng chính và luồng lỗi; không lộ dữ liệu hoặc mật khẩu; tài liệu bị ảnh hưởng đã cập nhật (`docs/API_CONTRACT.md`, `docs/testing/test-cases.md`, `docs/testing/traceability-matrix.md`, `RUNNING.md`).

## 4. Issues và tiến độ

- Mỗi việc một issue, có người phụ trách, nhãn (`enhancement`, `bug`, `docs`) và hạn.
- Bảng **Projects** của repo dùng bốn cột: *Cần làm*, *Đang làm*, *Chờ review*, *Xong*.
- Bảng phân công theo đợt vẫn giữ trong `docs/project/` để đưa vào báo cáo.

## 5. Kiểm thử trên máy trước khi đẩy

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests
npm.cmd --prefix apps/guest-web test
npm.cmd --prefix apps/guest-web run build
npm.cmd --prefix apps/admin-web run build
npm.cmd --prefix apps/mobile test -- --runInBand
$env:SAIGON_TEST_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm.cmd --prefix apps/guest-web run test:browser
```

Tất cả bộ test dùng SQLite tạm, không đụng DB chính. Chi tiết ở [kế hoạch kiểm thử](docs/testing/test-plan.md).

## 6. Dữ liệu và migration

- Không bao giờ sửa DB chính trong test hoặc script thử nghiệm.
- Migration mới: tệp số tiếp theo trong `backend/migrations/`, script đi kèm có `--check` (thử trên bản sao) và bắt buộc `--backup`, tăng `user_version`, nâng mức kiểm tra trong `backend/app/db/connection.py::validate_schema_version`, cập nhật `backend/migrations/README.md` và lệnh nâng cấp trong `RUNNING.md`.
- Hai nhánh cùng thêm migration thì thống nhất số trước khi code (ví dụ A = 004, C = 005).

## 7. Phiên bản và phát hành

- Đánh tag có chú thích ở mỗi mốc (demo, nộp bài) rồi đẩy tag và viết Release notes trên GitHub:

```text
git tag -a v1.0 -m "Bản nộp đồ án"
git push origin v1.0
```

- PRD nâng phiên bản theo [docs/requirements/README.md](docs/requirements/README.md).

## 8. Xuống dòng

`.gitattributes` giữ LF cho mã và tài liệu, CRLF cho script `.ps1`, đánh dấu `.docx`, `.png`… là nhị phân. Nếu sau khi pull git báo nhiều tệp "đã sửa" dù không đụng vào, chạy một lần:

```text
git add --renormalize .
```

## 9. Bảo vệ nhánh `main` (chủ repo cài một lần)

GitHub → **Settings → Rules → Rulesets** (hoặc **Branches → Branch protection rules**) → tạo quy tắc cho `main`:

- Require a pull request before merging, **1 approval**.
- Require status checks to pass: `backend`, `guest-web`, `admin-web`, `mobile`.
- Block force pushes và chặn xóa nhánh.
