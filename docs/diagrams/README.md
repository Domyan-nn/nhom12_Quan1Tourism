# Sơ đồ

Cập nhật 09/11/2026. Ảnh trong `use-case/`, `activity/`, `database/`, `architecture/` được trích nguyên từ [PRD](../../PRD_Saigon_Stories_Quan1_SQLite.docx) (các hình không đổi giữa bản 1.0 ngày 30/10/2026 và bản 1.1 ngày 09/11/2026) và đặt tên theo chú thích hình. Repo chưa có tệp nguồn chỉnh sửa được của các hình này; khi sửa sơ đồ, cập nhật cả PRD và ảnh tại đây. Sơ đồ tuần tự có nguồn Mermaid ngay trong tệp.

| Loại | Tệp | Nguồn trong PRD |
| --- | --- | --- |
| Use case tổng quan | [use-case/uc-overview.png](use-case/uc-overview.png) | Hình 1 |
| Use case từng chức năng | `use-case/uc01.png` … `use-case/uc12.png` | Mục VI, đầu mỗi UC |
| Hoạt động | `activity/uc01-activity.png` … `activity/uc12-activity.png` | Hình UC01-AD … UC12-AD |
| Lược đồ dữ liệu logic | [database/logical-schema.png](database/logical-schema.png) | Hình 2, mục 7.1 |
| Thành phần (UML 2.5.1) | [architecture/component-diagram.png](architecture/component-diagram.png) | Hình 3, mục 7.3 |
| Triển khai (UML 2.5.1) | [architecture/deployment-diagram.png](architecture/deployment-diagram.png) | Hình 4, mục 7.4 |
| Tuần tự (4 luồng) | [sequence/README.md](sequence/README.md) | Không có trong PRD, vẽ theo mã nguồn 09/11 |
| Thành phần và triển khai riêng mobile | [../mobile/diagrams/architecture/](../mobile/diagrams/architecture/) (nguồn `.dot`) | Không có trong PRD |

## Khác biệt giữa sơ đồ PRD và mã nguồn hiện tại

| Sơ đồ | PRD | Mã nguồn 09/11 |
| --- | --- | --- |
| Lược đồ dữ liệu | `categories` chỉ có `name`, `normalized_name` | Thêm `name_en`, `normalized_name_en` và chỉ mục duy nhất ([migration 003](../../backend/migrations/003_category_bilingual.sql)); chi tiết ở [data-dictionary.md](../analysis-design/data-dictionary.md) |
| Thành phần | Có giao diện `IImageStore` lưu ảnh | Chưa có lưu trữ ảnh; Admin nhập URL ảnh HTTP(S) |
| Triển khai | Máy chủ ứng dụng phục vụ `guest-web`, `admin-web`, HTTPS | Demo chạy Vite dev server và API HTTP trên LAN; chưa có cấu hình HTTPS/phục vụ bản build |
| Hoạt động UC08 | Thêm và sửa bài | Có thêm xóa bài; không xóa được bài hợp lệ cuối của địa điểm đang công khai |
| Hoạt động UC05 | Đăng nhập, phiên hết hạn, đăng xuất | Có thêm khóa tạm sau 5 lần sai trong 15 phút (429) và giữ phiên khi tải lại trang trong cùng tab; xem [SD-01](sequence/README.md#sd-01--đăng-nhập-khôi-phục-phiên-đăng-xuất-uc05) |
