# Mô tả cấu trúc dự án

Tài liệu này mô tả vị trí mã nguồn của Saigon Stories Quận 1. Ba ứng dụng độc lập nằm dưới `apps/`; backend FastAPI/SQLite ở `backend/`. Trạng thái chức năng và giới hạn kiểm thử nằm trong README của từng phần.

```text
nhom12_Quan1Tourism/
├── apps/
│   ├── admin-web/
│   ├── guest-web/
│   └── mobile/
├── backend/
├── docs/
│   └── mobile/
├── storage/                 # Dữ liệu runtime, bị Git bỏ qua
├── .gitignore
├── README.md
├── CAU_TRUC_DU_AN.md
└── PRD_Saigon_Stories_Quan1_SQLite.docx
```

Repo chưa có `.github/` hoặc workflow CI; không tạo thêm CI trong lần di chuyển này. Các thư mục cục bộ như `.venv` vẫn có thể tồn tại và bị Git bỏ qua.

| Đường dẫn cũ | Đường dẫn mới |
| --- | --- |
| `web/guest-web/` | `apps/guest-web/` |
| Phần Admin còn lại của `web/` | `apps/admin-web/` |
| `mobile/mobile/` | `apps/mobile/` |
| `mobile/docs/` | `docs/mobile/` |
| `mobile/README.md` | `docs/mobile/README.md` |
| Các tệp `.gitkeep` khung mobile bên ngoài ứng dụng | Cùng đường dẫn tương ứng dưới `apps/mobile/` |

Package.json và lockfile của cả ba ứng dụng được giữ nguyên nội dung. Imports nội bộ, endpoint, biến môi trường và dữ liệu không đổi theo lần di chuyển này. Hướng dẫn Windows và đồng bộ nhánh nằm tại [README](README.md) và [setup](docs/deployment/setup.md).

## Thư mục gốc

| Đường dẫn | Công dụng |
| --- | --- |
| `README.md` | Giới thiệu dự án, trạng thái, cấu trúc và trình tự bắt đầu phát triển. |
| `CAU_TRUC_DU_AN.md` | Tài liệu bạn đang đọc; giải thích vị trí và mục đích của từng phần. |
| `PRD_Saigon_Stories_Quan1_SQLite.docx` | Báo cáo yêu cầu sản phẩm và thiết kế đề xuất, là nguồn tham khảo cho các chức năng. |
| `.gitignore` | Quy định các tệp Git bỏ qua: môi trường cá nhân, thư viện cài đặt, database, ảnh tải lên và dữ liệu sinh ra khi chạy. |
| `.editorconfig` | Quy ước định dạng cơ bản như mã hóa, xuống dòng và thụt lề. |
| `.git/` | Dữ liệu nội bộ của Git: lịch sử, nhánh và cấu hình repository. Không chỉnh sửa thủ công khi làm đồ án. |
| `backend/` | Bộ khung backend dự kiến dùng FastAPI và SQLite. |
| `apps/admin-web/` | Ứng dụng React Admin. |
| `apps/guest-web/` | Ứng dụng React riêng dành cho khách. |
| `apps/mobile/` | Bộ khung ứng dụng React Native/Expo dành cho khách. |
| `docs/` | Tài liệu yêu cầu, thiết kế, kiểm thử, triển khai và báo cáo. |
| `docs/mobile/` | Tài liệu, sơ đồ và checklist mobile được chuyển nguyên từ mobile/docs. |
| `storage/uploads/poi-images/` | Vị trí dự kiến lưu ảnh địa điểm tải lên trên máy chạy ứng dụng; dữ liệu trong `storage/` bị Git bỏ qua. |

## Backend

| Đường dẫn | Công dụng |
| --- | --- |
| `backend/README.md` | Giới thiệu backend và vị trí các phần liên quan đến dữ liệu. |
| `backend/app/` | Nơi dự kiến đặt mã nguồn ứng dụng FastAPI. |
| `backend/app/api/` | Nhóm mã xử lý giao tiếp qua API. |
| `backend/app/api/routes/` | Các route dự kiến cho khách, đăng nhập, quản trị và thống kê. |
| `backend/app/core/` | Cấu hình chung và các chức năng cốt lõi như bảo mật, xác thực. |
| `backend/app/db/` | Code cấu hình và tạo kết nối đến SQLite. |
| `backend/app/models/` | Code định nghĩa các bảng và quan hệ dữ liệu. |
| `backend/app/schemas/` | Các cấu trúc kiểm tra dữ liệu đầu vào và đầu ra của API. |
| `backend/app/services/` | Quy tắc nghiệp vụ như công bố địa điểm, xác thực và thống kê. |
| `backend/data/` | Vị trí dự kiến lưu tệp SQLite cục bộ. |
| `backend/data/saigon_stories.db` | Tệp SQLite cục bộ; không được đưa lên Git theo `.gitignore`. |
| `backend/migrations/` | Nơi dự kiến lưu lịch sử thay đổi cấu trúc database. |
| `backend/migrations/001_initial.sql` | Schema SQLite ban đầu gồm bảy bảng theo báo cáo. |
| `backend/scripts/` | Script khởi tạo và nạp dữ liệu mẫu, gồm Admin demo. |
| `backend/scripts/README.md` | Giới hạn dữ liệu mẫu và yêu cầu kiểm tra nguồn nội dung, hình ảnh. |
| `backend/scripts/seed_db.py` | Nạp dữ liệu nháp và Admin demo mà không cập nhật bản ghi đã có. |
| `backend/app/db/connection.py` | Mở kết nối SQLite hiện có, bật khóa ngoại cho mỗi kết nối. |
| `backend/tests/test_database.py` | Kiểm thử khởi tạo, ràng buộc và seed trên database tạm. |
| `backend/scripts/init_db.py` | Khởi tạo schema trong database chưa có bảng hoặc view, không ghi đè dữ liệu có sẵn. |
| `backend/tests/` | Nơi dự kiến đặt kiểm thử tự động cho backend. |

Chỉ cần một database SQLite sử dụng khi chạy. `app/db/`, `models/`, `migrations/` và `scripts/` là các phần code hoặc hướng dẫn liên quan, không phải database riêng.

## Web

| Đường dẫn | Công dụng |
| --- | --- |
| `apps/admin-web/README.md` | Giới thiệu ứng dụng web Admin và trạng thái triển khai. |
| `apps/guest-web/` | Ứng dụng web khách riêng với cấu hình, mã nguồn và hướng dẫn chạy riêng. |
| `apps/admin-web/public/` | Tài nguyên tĩnh dự kiến phục vụ trực tiếp cho web. |
| `apps/admin-web/src/` | Nơi dự kiến đặt mã nguồn React. |
| `apps/admin-web/src/app/` | Khởi tạo ứng dụng, bố cục tổng thể và định tuyến. |
| `apps/admin-web/src/components/` | Các thành phần giao diện dùng chung. |
| `apps/admin-web/src/features/` | Các chức năng được nhóm theo nghiệp vụ. |
| `apps/admin-web/src/features/admin/` | Các chức năng dành cho Admin. |
| `apps/admin-web/src/features/admin/auth/` | Đăng nhập, đăng xuất và giao diện liên quan đến phiên Admin. |
| `apps/admin-web/src/features/admin/categories/` | Quản lý danh mục. |
| `apps/admin-web/src/features/admin/places/` | Quản lý địa điểm và trạng thái công bố. |
| `apps/admin-web/src/features/admin/narrations/` | Quản lý bài thuyết minh theo ngôn ngữ. |
| `apps/admin-web/src/features/admin/analytics/` | Giao diện xem lượt truy cập và phiên khách đang hoạt động. |
| `apps/admin-web/src/services/` | Code dùng chung để giao tiếp với API và dịch vụ cần thiết. |
| `apps/admin-web/src/styles/` | Kiểu giao diện dùng chung. |
| `apps/admin-web/tests/` | Nơi dự kiến đặt kiểm thử web. |

## Mobile

| Đường dẫn | Công dụng |
| --- | --- |
| `apps/mobile/README.md` | Giới thiệu bộ khung mobile và trạng thái triển khai. |
| `apps/mobile/assets/` | Hình ảnh, biểu tượng và tài nguyên tĩnh của ứng dụng. |
| `apps/mobile/src/` | Nơi dự kiến đặt mã nguồn React Native/Expo. |
| `apps/mobile/src/navigation/` | Điều hướng giữa các màn hình. |
| `apps/mobile/src/components/` | Thành phần giao diện dùng chung trên mobile. |
| `apps/mobile/src/features/` | Các chức năng mobile được nhóm theo nghiệp vụ. |
| `apps/mobile/src/features/places/` | Danh sách, tìm kiếm và chi tiết địa điểm. |
| `apps/mobile/src/features/map/` | Bản đồ địa điểm. |
| `apps/mobile/src/features/narration/` | Ngôn ngữ, nội dung và TTS trên thiết bị. |
| `apps/mobile/src/features/location/` | GPS, kiểm tra vùng và quy tắc tự phát khi ứng dụng đang hiển thị. |
| `apps/mobile/src/features/privacy/` | Lựa chọn đồng ý hoặc rút đồng ý thống kê. |
| `apps/mobile/src/services/` | Code dùng chung để giao tiếp với API và dịch vụ cần thiết. |
| `apps/mobile/tests/` | Nơi dự kiến đặt kiểm thử mobile. |
| `apps/mobile/tests/location/` | Kiểm thử quy tắc vị trí và tự phát. |

## Tài liệu đồ án

| Đường dẫn | Công dụng |
| --- | --- |
| `docs/requirements/` | Tài liệu và thông tin về các phiên bản yêu cầu. |
| `docs/requirements/README.md` | Liên kết đến PRD đang được giữ ở thư mục gốc. |
| `docs/analysis-design/` | Tài liệu phân tích và thiết kế. |
| `docs/analysis-design/architecture.md` | Kiến trúc tổng quan dự kiến và trách nhiệm các thành phần. |
| `docs/analysis-design/use-cases.md` | Danh sách UC01–UC12 trong báo cáo. |
| `docs/analysis-design/database-design.md` | Các bảng, quan hệ và quy tắc dữ liệu dự kiến. |
| `docs/analysis-design/api-design.md` | Các nhóm API cần thiết; sẽ bổ sung hợp đồng API khi thiết kế. |
| `docs/diagrams/` | Nơi lưu sơ đồ và tệp nguồn của sơ đồ. |
| `docs/diagrams/use-case/` | Sơ đồ use case. |
| `docs/diagrams/activity/` | Sơ đồ hoạt động. |
| `docs/diagrams/database/` | Sơ đồ dữ liệu, chẳng hạn ERD. |
| `docs/diagrams/architecture/` | Sơ đồ kiến trúc, thành phần và triển khai. |
| `docs/testing/` | Tài liệu và minh chứng kiểm thử. |
| `docs/testing/test-plan.md` | Phạm vi và cách chuẩn bị kiểm thử. |
| `docs/testing/test-cases.md` | Nơi ghi các ca kiểm thử, bước thực hiện và kết quả mong đợi. |
| `docs/testing/test-results.md` | Nơi ghi kết quả thực tế, phiên bản, môi trường và minh chứng. |
| `docs/testing/evidence/` | Ảnh hoặc minh chứng được chọn để phục vụ kiểm thử và bảo vệ. |
| `docs/deployment/` | Hướng dẫn cài đặt, demo và vận hành. |
| `docs/deployment/setup.md` | Hướng dẫn cài đặt sẽ được cập nhật khi ứng dụng được triển khai. |
| `docs/deployment/demo-guide.md` | Kịch bản demo dự kiến và thông tin cần chuẩn bị. |
| `docs/deployment/backup-restore.md` | Hướng dẫn dự kiến về sao lưu và phục hồi dữ liệu. |
| `docs/final-report/` | Nơi dự kiến lưu báo cáo, slide và tài liệu bàn giao cuối khóa. |

## Tệp `.gitkeep`

Mỗi tệp `.gitkeep` đang có trong các thư mục rỗng chỉ dùng để Git lưu lại đường dẫn thư mục đó. Tệp không chứa code và không ảnh hưởng đến hoạt động của ứng dụng. Khi thư mục đã có tệp thực tế được Git theo dõi, có thể xóa `.gitkeep` tương ứng.

Các thư mục bị bỏ qua như `storage/` và tệp SQLite cục bộ không tự xuất hiện khi người khác clone repository; hướng dẫn cài đặt cần mô tả cách tạo chúng khi triển khai.
