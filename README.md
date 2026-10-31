# Saigon Stories – Quận 1 Tourism

Đồ án ứng dụng khám phá và thuyết minh du lịch Quận 1. Khách sử dụng web hoặc mobile; Admin quản lý nội dung và xem thống kê trên web.

## Trạng thái

Repository mới có tài liệu yêu cầu và bộ khung thư mục. Các chức năng, API, cơ sở dữ liệu và hướng dẫn chạy ứng dụng **chưa được triển khai**.

Tài liệu hiện tại: [PRD Saigon Stories SQLite](PRD_Saigon_Stories_Quan1_SQLite.docx). Nhóm cần đối chiếu thêm quy định đồ án cuối khóa của trường và giảng viên.

Xem [mô tả từng thư mục và tệp](CAU_TRUC_DU_AN.md) để biết nơi đặt code và tài liệu.

## Cấu trúc dự án

| Thư mục | Trách nhiệm |
| --- | --- |
| `backend/` | FastAPI, nghiệp vụ, xác thực, migration và kiểm thử API |
| `web/` | React cho khách và Admin |
| `mobile/` | React Native/Expo cho khách, GPS và TTS |
| `docs/` | Yêu cầu, thiết kế, kiểm thử, triển khai và báo cáo |
| `backend/data/` | Tệp SQLite cục bộ khi chạy; không đưa dữ liệu vận hành lên Git |
| `storage/uploads/` | Vị trí dự kiến cho ảnh tải lên; không đưa dữ liệu vận hành lên Git |

Theo thiết kế dự kiến, các ứng dụng dùng chung FastAPI; backend truy cập SQLite cục bộ. GPS tự phát được xử lý trên mobile trong khi ứng dụng hiển thị. Bản đồ và TTS phụ thuộc dịch vụ hoặc thiết bị.

Tệp database dự kiến đặt tại `backend/data/saigon_stories.db`. Kết nối nằm trong `backend/app/db/`, model trong `backend/app/models/`, migration trong `backend/migrations/`, còn script tạo dữ liệu mẫu đặt trong `backend/scripts/`.

## Bắt đầu phát triển

1. Đọc PRD và [thiết kế tổng quan](docs/analysis-design/architecture.md).
2. Thống nhất mô hình dữ liệu, hợp đồng API và công cụ phát triển.
3. Cài đặt backend, migration, dữ liệu mẫu; sau đó phát triển web và mobile.
4. Cập nhật [hướng dẫn cài đặt](docs/deployment/setup.md) bằng lệnh thực tế khi mỗi thành phần được triển khai.
5. Ghi kết quả vào [tài liệu kiểm thử](docs/testing/test-results.md), kèm phiên bản và minh chứng.

Các tệp `.gitkeep` chỉ giữ chỗ cho thư mục chưa có nội dung; xóa chúng khi có mã nguồn hoặc tài liệu thực tế.
