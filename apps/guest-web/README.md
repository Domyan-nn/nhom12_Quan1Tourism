# Guest web – Saigon Stories

Ứng dụng React riêng cho khách tại `apps/guest-web`; Admin chạy từ `apps/admin-web`. Public API theo [hợp đồng chung](../../docs/API_CONTRACT.md): `/api/v1`, danh sách `items`, danh sách POI có `narration_locales` và chi tiết có `narrations`.

Hướng dẫn chạy và kiểm thử: [RUNNING.md](../../RUNNING.md).

## Ngôn ngữ và chức năng đang phát triển

UI có VI/EN, lưu lựa chọn tại localStorage riêng `saigon.guest.ui-language`, cập nhật html lang; không thay locale thuyết minh đang chọn khi đổi UI. Danh mục dùng `name` cho tiếng Việt và `name_en` cho tiếng Anh; nếu dữ liệu cũ chưa có tên tiếng Anh thì hiển thị tên tiếng Việt. Tên địa điểm và bài lấy nguyên từ dữ liệu. Danh sách locale bài theo dữ liệu, có thể hơn VI/EN; không tạo bản dịch thiếu.

Bản đồ `/map` dùng Leaflet 1.9.4 (khóa trong package-lock), tải danh sách và kiểm tra lại chi tiết qua public API hiện có. Marker chỉ nhận ID chuỗi không rỗng và tọa độ số hữu hạn trong miền hợp lệ; cùng tập marker được dùng để căn bản đồ. Chọn ghim bằng chuột/Enter/Space hoặc nút tên địa điểm để xem tóm tắt và mở chi tiết. Không yêu cầu GPS. Có loading, rỗng, lỗi dữ liệu/thử lại và lỗi nền bản đồ; luôn có đường về danh sách. UI chỉ VI/EN, nội dung địa điểm/thuyết minh giữ nguyên dữ liệu.

Nền ưu tiên `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; nếu không tải được thì dùng `https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png`. Khi cả hai nguồn lỗi, trang hiện sơ đồ vị trí với các ghim và nút thử lại. Cả hai nguồn đều hiện attribution tương ứng, không cần khóa dịch vụ cho demo phi thương mại. Leaflet có giấy phép BSD-2-Clause. Giữ HTTP Referer và cache mặc định của trình duyệt; không tải hàng loạt, prefetch hoặc offline. Các máy chủ tile công cộng có dung lượng giới hạn, không có SLA, có thể chặn lưu lượng không phù hợp. Xem [chính sách tile OSM](https://operations.osmfoundation.org/policies/tiles/), [điều kiện OSM Deutschland](https://openstreetmap.de/germanstyle/) và [Leaflet 1.9.4](https://leafletjs.com/reference-1.9.4.html). Demo không có tài khoản dịch vụ hoặc cấu hình thanh toán; triển khai có lưu lượng lớn cần chọn nhà cung cấp phù hợp và kiểm tra giá/điều khoản của họ.

`VITE_USE_MOCK=true` dùng dữ liệu mẫu có nhãn; `false` dùng `/api/v1` và không tự fallback khi lỗi. Cả hai chế độ vẫn cần mạng để tải tile OSM. POI của API thật phải là `published`; seed mặc định là `draft`. Dùng fixture riêng bên dưới để kiểm thử, không công bố nội dung mẫu lên môi trường vận hành.

Trang chi tiết đã nối TTS Web Speech: chỉ dùng giọng khớp ngôn ngữ bài, thiếu giọng/lỗi vẫn giữ văn bản; có Nghe, Dừng, Tạm dừng/Tiếp tục khi engine hỗ trợ và Phát lại khi không hỗ trợ. Đổi bài/ngôn ngữ hoặc rời trang dừng đọc. Test engine giả không xác nhận âm thanh thật.

UC12 đã nối ở chế độ API thật: banner/cài đặt VI/EN, chỉ sinh UUID/gửi heartbeat sau đồng ý; đồng bộ tab, chờ gửi lại yêu cầu rút khi offline/lỗi máy chủ. Mock không tạo phiên hoặc gửi thống kê, trang Privacy giải thích rõ chế độ này. Base API phải kết thúc bằng `/api/v1`; client thêm `/analytics/heartbeat` hoặc `/analytics/revoke`. Chi tiết lưu dữ liệu, lịch dọn và giới hạn ở hợp đồng API.

## Kiểm thử

Từ gốc repo: `npm.cmd --prefix apps/guest-web test`, `npm.cmd --prefix apps/guest-web run build` và `npm.cmd --prefix apps/guest-web run test:browser -- --reporter=line`. Browser test dùng FastAPI/SQLite tạm và Edge; các ca chức năng bản đồ dùng tile ảnh fixture, TTS dùng engine giả ở `tests/support/speech.js`. Các ca mạng lỗi/tọa độ sai dùng response giả lập; ca published/draft/hidden, UC12 và CRUD Admin dùng backend thật. Chẩn đoán OSM thật mặc định bị bỏ qua, bật bằng `SAIGON_TEST_REAL_OSM=1`; kết quả tile và fallback được ghi riêng. Xem [kết quả và giới hạn](../../docs/testing/integration-2026-11-04.md).
