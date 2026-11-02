# Kiến trúc dự kiến

- Web React gồm ứng dụng Admin tại `apps/admin-web/` và ứng dụng khách riêng tại `apps/guest-web/`; mobile React Native/Expo phục vụ khách.
- Các ứng dụng sử dụng chung API FastAPI. Backend là một ứng dụng có các module nghiệp vụ.
- SQLite lưu trên máy chủ ứng dụng; ảnh địa điểm được lưu hoặc tham chiếu theo cấu hình triển khai.
- TTS chạy theo khả năng của trình duyệt hoặc thiết bị. Mobile xử lý GPS khi ứng dụng hiển thị; bản đồ sử dụng dịch vụ bên ngoài.
- Quyền Admin phải được kiểm tra tại backend. Không lưu lịch sử tọa độ khách cho thống kê.

Đây là thiết kế mục tiêu theo PRD, chưa phải mô tả một hệ thống đã chạy. Cập nhật khi có quyết định kỹ thuật hoặc sơ đồ chính thức.
