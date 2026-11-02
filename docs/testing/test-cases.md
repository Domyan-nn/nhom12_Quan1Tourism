# Danh sách ca kiểm thử

Các ca dưới đây được bổ sung cho đợt sửa tích hợp 02/11/2026, chưa ghi nhận phê duyệt riêng của nhóm. Dùng database tạm và fixture test, không sửa trạng thái seed trong database cá nhân. Kết quả thực thi ở [test-results.md](test-results.md).

| Mã ca | UC / BR | Tình huống | Kết quả mong đợi |
| --- | --- | --- | --- |
| API-01 | UC01 / BR01 | Seed nháp trong DB tạm; gọi danh sách và chi tiết draft/hidden/missing | Danh sách chỉ published; ba loại chi tiết trên đều 404 POI_NOT_FOUND |
| API-02 | UC01 / BR02 | Tìm NFC/NFD, khác hoa thường, danh mục, kết hợp và không khớp | Đúng tập POI; kết hợp AND; không khớp là items rỗng |
| API-03 | UC01 / BR03 | Gọi categories, POI list và detail | List có items, POI list có narration_locales, detail có narrations; không lộ status/Admin |
| WEB-01 | UC01 | Adapter thật nhận items, rỗng, JSON/envelope sai, mất mạng và 404 | Mảng cho UI; phân biệt empty/error/404; không fallback mock |
| WEB-02 | UC01 | Mock và tìm/lọc; ghi nhận request | 5 POI mẫu; đúng locale/shape; không gọi public API |
| WEB-03 | UC01 / UC03 / BR03 | Chọn bài EN (mock) hoặc FR (fixture thật), đổi UI VI→EN | Nhãn UI đổi, bài/locale đã chọn giữ nguyên; UI lưu riêng qua reload |
| WEB-04 | UC01 / NFR04 | Trì hoãn tải, abort mạng, tải danh mục lỗi, bấm thử lại | Loading/error/empty dịch đúng; thử lại khôi phục danh sách thật |
| WEB-05 | UC02 / UC12 | Mở trang bản đồ và riêng tư VI/EN | Mô tả rõ đang phát triển, không hứa consent/retention đã hoạt động |
| DB-01 | NFR03 | Init file mới qua 001+002 | user_version=2, hai bảng analytics có CHECK/FK/index chuẩn |
| DB-02 | NFR03 | Tạo DB theo 001, thêm dữ liệu hợp lệ, check rồi upgrade có backup | Check không đổi file; upgrade giữ dữ liệu và bảng khác; backup giữ schema cũ |
| DB-03 | NFR03 | DB theo schema analytics riêng cũ, có chỉ mục tên cũ | Upgrade giữ revoked session và NULL session_id; tạo tên chỉ mục chuẩn |
| DB-04 | NFR03 | UUID/time/consent/event sai hoặc orphan FK | Dừng, rollback schema và dòng dữ liệu, bật lại FK |
| DB-05 | NFR03 | Không backup, backup trùng, DB thiếu hoặc custom index | Từ chối; không tạo DB nguồn hoặc xóa thành phần tùy biến |
| DB-06 | NFR03 | Chạy CREATE TABLE IF NOT EXISTS với CHECK mới trên bảng cũ | Bảng cũ vẫn nhận dữ liệu sai; migration kiểm tra và từ chối dữ liệu đó |

API-01..03 chạy trong backend/tests/test_public_api.py; DB-01..06 trong test_analytics_migration.py cùng test_database.py. WEB-01..02 có test Node; WEB-02..05 chạy Edge bằng Playwright, tự chạy FastAPI thật trên DB tạm và hai Vite mock/thật. Admin auth/danh mục tiếp tục được kiểm tra bởi test_admin_api.py.
