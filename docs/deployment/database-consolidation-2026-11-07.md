# Chuyển sang DB chính — 07/11/2026

Theo yêu cầu của người dùng, nguồn dữ liệu là `backend/data/local-dev.db`; đích vận hành duy nhất là `backend/data/saigon_stories.db`. Trước khi chuyển, DB đích cũ có schema phiên bản 0 và không có dữ liệu. Các tiến trình API/web cũ đã được dừng trước thao tác.

## Dữ liệu đã giữ nguyên

Đã tạo snapshot bằng SQLite Backup API, kiểm tra `integrity_check=ok`, không có lỗi khóa ngoại và `user_version=2`. Đối chiếu toàn bộ `sqlite_master`, nội dung từng dòng của bảy bảng và phiên bản schema giữa nguồn, snapshot và DB đích trước khi khởi động lại API đều trùng nhau. Không init/seed/migrate, đổi mật khẩu, dịch bài hoặc công bố thêm địa điểm.

| Bảng | Số dòng tại thời điểm chuyển |
| --- | ---: |
| `admin_accounts` | 1 |
| `admin_sessions` | 8 |
| `categories` | 2 |
| `pois` | 5 |
| `poi_narrations` | 6 |
| `anonymous_sessions` | 2 |
| `visit_events` | 3 |

Số dòng phiên/thống kê có thể thay đổi khi hệ thống được sử dụng hoặc chạy retention theo chính sách hiện có.

## DB phụ và bản dự phòng

Đã lưu ZIP dự phòng và kiểm tra CRC trước khi thay DB chính và xóa 9 DB phụ: `local-dev.db`, hai DB `demo-*`, một DB `preview-*`, ba backup local-dev rời trong `backend/data/`, cùng hai backup preview trong `storage/database-backups/`.

Bản dự phòng cục bộ: `backups/database-consolidation-20261107T153330Z.zip`, chứa các DB cũ và snapshot nguồn đã kiểm tra. Biên bản đối chiếu chi tiết nằm ở `storage/runtime/database-consolidation.json`. Các tệp dữ liệu, snapshot, log và `.env` bị Git bỏ qua; không đưa tài khoản hoặc dữ liệu vận hành lên repository.

## Kết nối và thư mục sau chuyển đổi

- Backend mặc định dùng `backend/data/saigon_stories.db`; script bật hệ thống đặt rõ `SAIGON_DATABASE` về đường dẫn này.
- Admin/Guest dùng proxy `/api` tới FastAPI cổng 8000. Guest mặc định dùng API thật.
- Mobile mặc định dùng API thật, style `v1`; `.env` cục bộ và `.env.example` đã chọn `EXPO_PUBLIC_USE_MOCK=false`. Script tự chọn IP LAN và đặt URL `http://<IP-LAN>:8000/api`. Bundle đã xác nhận biến mock có giá trị `false`.
- `scripts/start-system.ps1` sao lưu DB chính rồi bật bốn dịch vụ; `stop-system.ps1` dừng các tiến trình được ghi nhận theo PID và thời điểm khởi chạy. Đã thực hiện một lượt bật, dừng và bật lại với IP LAN tự nhận.
- Mã mobile duy nhất ở `apps/mobile/`; đã dọn thư mục gốc `mobile/` trống, thư mục ORM `backend/app/models/` không có mã, thư mục Admin khung không có mã và các placeholder dư. SQL tham khảo chuyển sang `docs/analysis-design/analytics-schema-reference.sql`.

Hướng dẫn hiện tại ở [RUNNING](../../RUNNING.md), [cấu trúc thư mục](../../CAU_TRUC_DU_AN.md) và [sao lưu/phục hồi](backup-restore.md). Test tự động tiếp tục dùng SQLite tạm riêng, không ghi/xóa DB chính. Kết quả kiểm tra sau chuyển đổi được ghi trong [test-results](../testing/test-results.md).

Mobile UC12 hiện đã được cấu hình gọi API thật để người dùng kiểm thử tiếp. Chưa dùng thay đổi cấu hình hoặc bundle thành công làm bằng chứng đã hoàn tất đồng ý/rút đồng ý trên điện thoại.
