# Cấu trúc hệ thống Saigon Stories

Cập nhật 07/11/2026, bổ sung 14/11/2026 (schema 5, ảnh tải lên, nhật ký Admin, thư mục `docs/project/`): mã ứng dụng, dữ liệu vận hành, bản sao lưu và tài liệu được đặt riêng. Cả ba ứng dụng dùng chung API FastAPI và một DB chính.

```text
nhom12_Quan1Tourism/
├── apps/
│   ├── admin-web/                 # React Admin, cổng 5174
│   ├── guest-web/                 # React khách, cổng 5173
│   └── mobile/                    # React Native / Expo SDK 58, cổng 8081
├── backend/
│   ├── app/
│   │   ├── api/                   # Dependency và route HTTP
│   │   ├── core/                  # Bảo mật
│   │   ├── db/                    # Kết nối SQLite, repository
│   │   ├── schemas/               # Schema request/response
│   │   ├── services/              # Nghiệp vụ, thống kê, retention
│   │   └── main.py                # FastAPI entry point
│   ├── data/
│   │   └── saigon_stories.db       # DB chính cục bộ (Git bỏ qua)
│   ├── migrations/                # SQL quản lý phiên bản schema
│   ├── scripts/                   # Init, seed, migrate, backup
│   └── tests/                     # Test trên SQLite tạm riêng
├── scripts/
│   ├── start-system.ps1           # Sao lưu, bật API + hai web + mobile
│   └── stop-system.ps1            # Dừng các dịch vụ đã khởi chạy
├── storage/                       # Dữ liệu runtime, Git bỏ qua
│   ├── runtime/                   # Log, PID, biên bản chuyển DB cục bộ
│   └── uploads/                   # Ảnh Admin tải lên (pois/); sao lưu cùng DB
├── backups/                       # Snapshot và ZIP dự phòng, Git bỏ qua
├── docs/
│   ├── analysis-design/           # Thiết kế và SQL tham khảo
│   ├── deployment/                # Cài đặt, vận hành, sao lưu
│   ├── diagrams/                  # Nguồn sơ đồ
│   ├── mobile/                    # Sơ đồ, checklist và kết quả thiết bị
│   ├── project/                   # Phân công, tiến độ phần mở rộng A/B/C/G, hướng dẫn nắm backend
│   ├── requirements/              # Tài liệu yêu cầu
│   ├── testing/                   # Test plan, kết quả, công cụ fixture
│   └── final-report/              # Tài liệu bàn giao
├── README.md
├── RUNNING.md
├── CAU_TRUC_DU_AN.md
└── PRD_Saigon_Stories_Quan1_SQLite.docx
```

## DB chính và kết nối

`backend/data/saigon_stories.db` đã được thay bằng snapshot kiểm tra hợp lệ của `local-dev.db`, giữ nguyên schema, ID, tài khoản/mật khẩu, trạng thái nội dung và dữ liệu bảy bảng. Tại thời điểm chuyển (07/11) DB chính ở `user_version=2`; sau đó đã nâng lên `user_version=5` (migration 004 ghi công ảnh, 005 nhật ký Admin, thêm bảng `admin_audit_log` thành bảng thứ tám) và API từ chối DB thấp hơn, xem [RUNNING](RUNNING.md). Trước khi khởi động lại API, đã đối chiếu toàn bộ schema và từng dòng dữ liệu với nguồn; không seed hoặc tự công bố thêm địa điểm.

Các DB local-dev/demo/preview và bản backup rời cũ đã được xóa sau khi lưu ZIP dự phòng ở `backups/`. Trong `backend/data/` chỉ giữ DB chính và `.gitkeep`. SQL tham khảo thống kê chuyển từ `backend/data/schema_analytics.sql` sang `docs/analysis-design/analytics-schema-reference.sql`; migration thực tế vẫn nằm tại `backend/migrations/`.

Admin và Guest chuyển `/api` qua Vite proxy tới backend cổng 8000. Mobile gọi `http://<IP-LAN>:8000/api`, style `v1`. Backend dùng DB chính theo mặc định; `SAIGON_DATABASE` chỉ dùng để chỉ định rõ hoặc chọn DB riêng khi kiểm thử/phục hồi. Hai client khách mặc định dùng API thật; mock vẫn là lựa chọn rõ ràng cho phát triển.

DB, backup, `.env`, log, `.venv`, `node_modules` và output build không nằm trong Git. Clone repo không kèm dữ liệu vận hành: phải phục hồi snapshot hoặc chủ động tạo DB riêng theo [RUNNING](RUNNING.md).

## Quy ước thư mục

Mỗi ứng dụng có `package.json` và lockfile riêng; không có npm workspace chung. Mã mobile duy nhất ở `apps/mobile/`; thư mục gốc `mobile/` cũ đã được dọn vì chỉ còn thư mục trống. Backend dùng SQLite trực tiếp qua repository, không có lớp ORM hoặc thư mục `models/` khung. Các `.gitkeep` dư trong thư mục đã có mã nguồn và thư mục Admin khung không có mã đã được dọn; các vị trí tài liệu/tài nguyên trống còn dùng vẫn giữ placeholder.

Test fixture trong `apps/guest-web/tests/serve_api.py` và các test backend/mobile vẫn dùng SQLite tạm riêng. Đây là dữ liệu kiểm thử tự hủy, không phải DB demo vận hành. Không chuyển test ghi/xóa sang DB chính.

Bật toàn hệ thống bằng `powershell -ExecutionPolicy Bypass -File scripts/start-system.ps1`; dừng bằng `scripts/stop-system.ps1`. Hướng dẫn đầy đủ: [RUNNING.md](RUNNING.md).
