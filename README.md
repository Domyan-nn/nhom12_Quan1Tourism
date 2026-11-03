# Saigon Stories – Quận 1 Tourism

Đồ án ứng dụng khám phá và thuyết minh du lịch Quận 1. Khách sử dụng web hoặc mobile; Admin quản lý nội dung và xem thống kê trên web.

## Trạng thái

Repository có SQLite, seed dữ liệu nháp, FastAPI cho đăng nhập Admin, danh mục, quản lý địa điểm và bài thuyết minh, và địa điểm công khai; ứng dụng React Admin và web khách được tách riêng. Guest web hỗ trợ mock và API thật `/api/v1`, có UI VI/EN độc lập với ngôn ngữ thuyết minh. Mobile đã có mã Expo nhưng tích hợp và thiết bị cần kiểm thử riêng. Upload ảnh, công bố/ẩn địa điểm, bản đồ/TTS web, API thống kê và dashboard còn chờ triển khai. Xem [hướng dẫn chạy](RUNNING.md), [nội dung mẫu](backend/scripts/README.md), [hợp đồng API](docs/API_CONTRACT.md) và [kết quả kiểm thử](docs/testing/test-results.md).

Hướng dẫn cài đặt, chạy Admin, guest web, mobile và kiểm thử: [RUNNING.md](RUNNING.md).

## Cấu trúc dự án

| Thư mục | Trách nhiệm |
| --- | --- |
| `backend/` | FastAPI, nghiệp vụ, xác thực, migration và kiểm thử API |
| `apps/admin-web/` | Ứng dụng React Admin, cổng Vite mặc định 5174 |
| `apps/guest-web/` | Ứng dụng React dành cho khách, cổng Vite mặc định 5173 |
| `apps/mobile/` | React Native/Expo cho khách, GPS và TTS |
| `docs/` | Yêu cầu, thiết kế, kiểm thử, triển khai và báo cáo |
| `docs/mobile/` | Tài liệu, sơ đồ và checklist thiết bị của mobile |
| `backend/data/` | Tệp SQLite cục bộ khi chạy; không đưa dữ liệu vận hành lên Git |
| `storage/uploads/` | Vị trí dự kiến cho ảnh tải lên; không đưa dữ liệu vận hành lên Git |

Theo thiết kế dự kiến, các ứng dụng dùng chung FastAPI; backend truy cập SQLite cục bộ. GPS tự phát được xử lý trên mobile trong khi ứng dụng hiển thị. Bản đồ và TTS phụ thuộc dịch vụ hoặc thiết bị.

Tệp database dự kiến đặt tại `backend/data/saigon_stories.db`. Kết nối nằm trong `backend/app/db/`, model trong `backend/app/models/`, migration trong `backend/migrations/`, còn script tạo dữ liệu mẫu đặt trong `backend/scripts/`.

## Ánh xạ khi chuyển sang apps

| Đường dẫn cũ | Đường dẫn mới |
| --- | --- |
| `web/guest-web/` | `apps/guest-web/` |
| Phần Admin còn lại trong `web/` | `apps/admin-web/` |
| `mobile/mobile/` | `apps/mobile/` |
| `mobile/docs/` | `docs/mobile/` |
| `mobile/README.md` | `docs/mobile/README.md` |
| Các tệp khung `.gitkeep` dưới `mobile/src`, `mobile/assets`, `mobile/tests` | Gộp vào thư mục tương ứng của `apps/mobile/` |

Backend, docs hiện có và storage giữ vị trí. Mỗi ứng dụng vẫn có package.json, lockfile, dependency và lệnh chạy độc lập; không có npm workspace chung ở gốc. Các báo cáo kiểm thử lịch sử giữ tên đường dẫn ở thời điểm kiểm tra, còn liên kết trỏ đến vị trí mới.

## Bắt đầu phát triển

1. Đọc PRD và [thiết kế tổng quan](docs/analysis-design/architecture.md).
2. Thống nhất mô hình dữ liệu, hợp đồng API và công cụ phát triển.
3. Cài đặt backend, migration, dữ liệu mẫu; sau đó phát triển web và mobile.
4. Cập nhật [hướng dẫn cài đặt](docs/deployment/setup.md) bằng lệnh thực tế khi mỗi thành phần được triển khai.
5. Ghi kết quả vào [tài liệu kiểm thử](docs/testing/test-results.md), kèm phiên bản và minh chứng.

Các tệp `.gitkeep` chỉ giữ chỗ cho thư mục chưa có nội dung; xóa chúng khi có mã nguồn hoặc tài liệu thực tế.
