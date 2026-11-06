# Saigon Stories – Quận 1 Tourism

Đồ án ứng dụng khám phá và thuyết minh du lịch Quận 1. Khách sử dụng web hoặc mobile; Admin quản lý nội dung và xem thống kê trên web.

## Trạng thái

Dự án đã có các luồng UC01–UC12 trên FastAPI/SQLite và các ứng dụng: xác thực Admin, danh mục, địa điểm, thuyết minh, công bố/ẩn và thống kê theo đồng ý. Admin React có Dashboard và điều khiển công bố/ẩn. Guest React có tìm/lọc, Leaflet/OpenStreetMap, Web Speech và quyền riêng tư. Mobile Expo đã nối UC12 với API thật từ commit `48a0908`; GPS chỉ theo dõi foreground phía mobile. Giao diện VI/EN độc lập với các ngôn ngữ bài đã lưu, không tự dịch nội dung.

Đợt bàn giao 06/11/2026 bổ sung kiểm thử chéo, sửa công bố/ẩn, Dashboard, vòng đời TTS và rút đồng ý mobile; xem [báo cáo cùng bảng F01–F12/NFR01–NFR08](docs/testing/integration-2026-11-06.md). [Kiểm tra nghiệm thu kỹ thuật trên commit `4723a49`](docs/testing/acceptance-readiness-2026-11-06.md) xác nhận các bộ tự động backend/web đạt và bản đồ web tải được ảnh nền thật qua nguồn dự phòng; dự án sẵn sàng cho bước demo và kiểm thử hiện trường. GPS/TTS và bản đồ native trên điện thoại, âm thanh thật, nội dung demo được duyệt và cài mới trên máy khác vẫn cần nhóm xác minh. Seed chỉ tạo bản nháp với nội dung placeholder, chưa có ảnh. Upload ảnh **tạm gác**, giữ đường dẫn ảnh hiện có.

Xem [hướng dẫn chạy](RUNNING.md), [dữ liệu mẫu](backend/scripts/README.md), [hợp đồng API](docs/API_CONTRACT.md), [sao lưu/phục hồi](docs/deployment/backup-restore.md) và [checklist demo 07/11](docs/deployment/demo-guide.md). API dọn thống kê quá cửa sổ 30 ngày lúc khởi động và mỗi 00:00 Việt Nam; chọn đúng database và sao lưu trước khi chạy.

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

Database được chọn bằng `SAIGON_DATABASE`; không tự khởi tạo database cá nhân. Kết nối và repository nằm trong `backend/app/db/`, request schema trong `backend/app/schemas/` và một số route, migration trong `backend/migrations/`, script trong `backend/scripts/`. Không có lớp ORM trong `app/models/`.

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
