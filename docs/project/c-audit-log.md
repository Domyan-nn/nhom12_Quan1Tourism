# Phần mở rộng C – Nhật ký thao tác Admin (feat/c-audit-log)

## Yêu cầu

- Bảng `admin_audit_log(id, admin_id, action, target_type, target_id, summary, created_at)` (migration **005**, `user_version = 5`), làm sau A.
- Mỗi thao tác quản trị **thành công** ghi một dòng: đăng nhập, đăng xuất, thêm/sửa/xóa danh mục, địa điểm, bài thuyết minh, công bố, ẩn, tải/xóa ảnh. Thao tác bị từ chối (401/409/422…) không ghi. Không ghi mật khẩu hay nội dung bài.
- `GET /api/v1/admin/audit-log?limit=50` (mới nhất trước, cần phiên Admin) và tab **Nhật ký** trong Admin.

## Quyết định thiết kế (các điểm đặc tả ngày 10/11 chưa nêu)

| Quyết định | Lý do |
| --- | --- |
| `admin_id` là `NOT NULL`, `ON DELETE RESTRICT` | Nhật ký phải biết ai làm. Tài khoản đã có nhật ký không xóa được, chỉ khóa (`is_active = 0`), khớp PRD (Admin được cấp qua vận hành). `CASCADE` sẽ xóa lịch sử, `SET NULL` làm mất người thực hiện |
| `audit.record(db, admin_id, action, …)` chỉ INSERT, **không commit**, gọi bên trong `with db:` của chính thao tác, sau khi thao tác thành công | Dòng log và thay đổi cùng commit hoặc cùng rollback: thao tác bị từ chối (ném lỗi trong `with`) không để lại dòng nào, thao tác thành công không thể mất dòng. Khác kế hoạch "gọi ở cuối route", vì cuối route thì transaction đã commit |
| Các hàm service/route nhận thêm `admin_id` (từ `session["admin_id"]`) | Cần biết người thực hiện bên trong transaction; request/response API không đổi |
| Xóa địa điểm ghi **một** dòng `poi.delete`; bài thuyết minh bị xóa kèm không ghi riêng | Một thao tác của Admin là một dòng; tránh dòng ảo |
| `summary` chỉ là nhãn: tên địa điểm/danh mục, hoặc «tên địa điểm / mã ngôn ngữ» với bài; làm sạch về một dòng, tối đa 200 ký tự | Không lộ nội dung bài, không cho phép chèn xuống dòng vào bảng |
| Danh sách `action` cố định trong `audit.ACTIONS`; action lạ ném `ValueError` | Tránh lỗi gõ sai làm lệch báo cáo |
| `limit` 1–200, mặc định 50, ngoài khoảng trả 422; sắp theo `created_at` rồi `rowid` giảm dần | Chặn truy vấn quá lớn; cùng một giây vẫn đúng thứ tự ghi |
| Đăng nhập sai không ghi | Chưa biết tài khoản; đã có `login_throttle` chống dò mật khẩu. Nếu cần theo dõi đăng nhập sai thì làm bảng/mức khác |
| API từ chối khởi động nếu DB chưa lên schema 5 (kèm hướng dẫn chạy `migrate_005_admin_audit_log.py`) | Giống migration 004: API không tự migrate |

## Tiến độ (12/11)

| Hạng mục | Trạng thái |
| --- | --- |
| Migration 005 + runner (`--check`, `--backup`, rollback), `init_db.py` áp dụng 001→005 | Xong, có test |
| `audit.py`, repository, route đọc log, gắn vào auth, danh mục, địa điểm, bài, công bố/ẩn, ảnh | Xong |
| Tab Nhật ký (vi/en, trạng thái tải/rỗng/lỗi/thử lại, giờ Việt Nam) | Xong; `npm run build` admin-web đạt |
| Test backend `test_audit_log.py` (19 ca) | Đạt; toàn bộ 132 ca backend đạt |
| Playwright `admin.spec.js` (ca mới tab Nhật ký) | Đã viết, **chưa chạy** (cần Edge như CI e2e) |
| PR, review, merge | Chưa |
| Migrate DB chính `backend/data/saigon_stories.db` | Chưa (xem dưới) |

## Việc còn lại trước khi merge

1. Chạy Playwright (`npm run test:browser` trong `apps/guest-web`) hoặc xem kết quả job `e2e` của CI.
2. Mở PR theo CONTRIBUTING; người review khác tác giả (kế hoạch giao review C chưa có tên).
3. Sau khi merge: dừng API, sao lưu rồi chạy migration 005 trên DB chính và trên **mọi máy demo** (RUNNING.md mục mới), vì DB nằm ngoài Git.
4. PRD: thêm bảng `admin_audit_log` (bảng thứ 8, mục 7.1 và Hình 2), `GET /admin/audit-log`, và nêu C là phần mở rộng ngoài F01–F12.

## Giới hạn đã biết

- Chưa có thời hạn lưu hay dọn nhật ký (PRD chỉ định thời hạn 30 ngày cho thống kê, không cho nhật ký); chưa có phân trang hay lọc theo người/thao tác.
- Chỉ ghi qua API Admin. Thay đổi trực tiếp vào DB, `seed_db.py` hay script demo (`add_demo_images.py`, `enrich_demo_content.py`) không có dòng nhật ký.
- Đăng nhập sai và bị chặn (401/429) không ghi.
- Thời gian lưu UTC; giao diện đổi sang giờ Việt Nam.

## Kiểm thử

- Backend: `python -m unittest discover -s backend/tests` (toàn bộ) hoặc `python -m unittest discover -s backend/tests -p "test_audit_log.py"`.
- Đã thử đột biến: bỏ dòng log của công bố/ẩn làm hai test fail. Hai đột biến khác (đặt log trước kiểm tra 409; bỏ `rowid` khỏi ORDER BY) không đổi kết quả vì transaction rollback và chỉ mục `created_at` đã cho cùng hành vi; vẫn giữ để không phụ thuộc chi tiết của SQLite.
- Admin: `npm --prefix apps/admin-web run build`; Playwright: `admin.spec.js › "Activity log tab lists…"`.
