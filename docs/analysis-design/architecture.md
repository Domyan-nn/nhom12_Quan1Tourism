# Kiến trúc đối chiếu mã nguồn 06/11/2026

- Web React gồm ứng dụng Admin tại `apps/admin-web/` và ứng dụng khách riêng tại `apps/guest-web/`; mobile React Native/Expo phục vụ khách.
- Các ứng dụng sử dụng chung API FastAPI. Backend là một ứng dụng có các module nghiệp vụ.
- SQLite lưu trên máy chủ ứng dụng; ảnh địa điểm được lưu hoặc tham chiếu theo cấu hình triển khai.
- TTS chạy theo khả năng của trình duyệt hoặc thiết bị. Mobile xử lý GPS khi ứng dụng hiển thị; bản đồ sử dụng dịch vụ bên ngoài.
- Quyền Admin phải được kiểm tra tại backend. Không lưu lịch sử tọa độ khách cho thống kê.

FastAPI chính đã đăng ký Public, Auth, Categories, Admin POI/Narration/Status, Admin Stats và Analytics; UC12 mobile cũng gọi chung backend. Repository SQL và services dùng SQLite nhúng, không có máy chủ DB riêng hay ORM. Admin/guest là hai Vite app độc lập, không có npm workspace chung. Public base `/api/v1`, mobile cấu hình host kết thúc `/api` và style `v1`.

Web map dùng Leaflet/OSM; native map dùng react-native-maps. TTS dùng Web Speech/Expo Speech và nội dung database. GPS foreground chạy phía mobile; không lưu/gửi tọa độ cho analytics. Ảnh là URL HTTP(S) hoặc tệp Admin tải lên: `backend/app/services/media.py` lưu tệp ở `storage/uploads/pois/` (đổi bằng `SAIGON_UPLOADS`), route `/api/media/pois/{file}` phục vụ ảnh qua proxy `/api` sẵn có; cột `pois.image_credit` (migration 004) lưu ghi công ảnh. Retention là tác vụ trong FastAPI lifespan chạy startup và 00:00 Việt Nam, không phải service riêng. Dev web dùng proxy Vite; điện thoại gọi HTTP LAN trên mạng phát triển tin cậy. HTTPS/reverse proxy là cấu hình triển khai cần xác minh riêng.

Sơ đồ DOT/SVG/PNG trong docs/mobile/diagrams còn là thiết kế đề xuất. Thuận cần thêm kết nối Admin→API vào deployment, ghi rõ đường dẫn thực tế apps/, phân biệt HTTP dev với HTTPS mục tiêu và thay khối poi-media/IImageStore bằng thư mục `storage/uploads/` cùng route `/api/media` đã triển khai. Chưa render hoặc sửa hình/Word trong đợt này; [báo cáo](../testing/integration-2026-11-06.md) ghi phần chờ xác minh.
