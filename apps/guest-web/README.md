# Guest web – Saigon Stories

Ứng dụng React riêng cho khách tại `apps/guest-web`; Admin chạy từ `apps/admin-web`. Public API theo [hợp đồng chung](../../docs/API_CONTRACT.md): `/api/v1`, danh sách `items`, danh sách POI có `narration_locales` và chi tiết có `narrations`.

Hướng dẫn chạy và kiểm thử: [RUNNING.md](../../RUNNING.md).

## Ngôn ngữ và chức năng đang phát triển

UI có VI/EN, lưu lựa chọn tại localStorage riêng `saigon.guest.ui-language`, cập nhật html lang; không thay locale thuyết minh đang chọn khi đổi UI. Danh mục dùng `name` cho tiếng Việt và `name_en` cho tiếng Anh; nếu dữ liệu cũ chưa có tên tiếng Anh thì hiển thị tên tiếng Việt. Tên địa điểm và bài lấy nguyên từ dữ liệu. Danh sách locale bài theo dữ liệu, có thể hơn VI/EN; không tạo bản dịch thiếu.

Bản đồ, nghe TTS và consent/thống kê còn chờ tích hợp. Trang riêng tư ghi rõ trạng thái này; guest web chưa gửi thống kê và chưa cam kết lịch lưu/xóa dữ liệu đang vận hành.
