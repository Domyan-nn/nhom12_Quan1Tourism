# Web Admin

Ứng dụng React/Vite dành cho Admin; xem [hướng dẫn chạy](../../RUNNING.md). Vite dùng cổng 5174 và chuyển `/api` đến `http://127.0.0.1:8000`. Token Admin chỉ giữ trong bộ nhớ trang và bị mất khi tải lại; cần đăng xuất để thu hồi phiên phía server.

Web khách là ứng dụng riêng tại [apps/guest-web](../guest-web/README.md).
# Quản lý địa điểm và thuyết minh

Sau khi đăng nhập, chọn địa điểm để xem/sửa hoặc dùng nút thêm. Nhập tên, địa chỉ, danh mục, tọa độ, bán kính và ảnh tùy chọn (URL HTTP(S), hoặc tải tệp JPG/PNG/WebP ≤ 2 MB sau khi đã lưu địa điểm, kèm **ghi công ảnh**; có nút **Xóa ảnh**); địa điểm mới luôn là draft. Xóa yêu cầu xác nhận và xóa các bài liên quan. Chọn địa điểm để thêm bài bằng mã ngôn ngữ (ví dụ `vi`, `en`, `fr`) hoặc sửa tiêu đề và nội dung. Ngôn ngữ giao diện VI/EN độc lập với ngôn ngữ bài. Dữ liệu nhập được giữ khi lưu thất bại trong phiên trang.

Sau khi lưu dữ liệu và bài thuyết minh đã được nhóm kiểm duyệt, dùng **Công bố** để chuyển draft/hidden thành published. Backend kiểm tra lại địa điểm và ít nhất một bài hợp lệ; giao diện hiển thị các mục thiếu khi chưa thể công bố. **Ẩn địa điểm** chuyển published thành hidden và loại địa điểm khỏi API khách. Cả hai thao tác đều yêu cầu xác nhận. Không công bố seed/placeholder chưa được duyệt.

Dashboard tích hợp số lượt hôm nay, 7 ngày và bộ lọc tối đa 30 ngày theo giờ Việt Nam. Phiên hoạt động lấy cửa sổ 90 giây và tự làm mới mỗi 30 giây khi trang hiển thị; lỗi hiển thị Không khả dụng, không thay số liệu bằng 0. Khi đổi khoảng ngày hoặc làm mới, yêu cầu cũ bị hủy để tránh ghi đè số liệu mới.

Có thể xóa riêng từng bài thuyết minh; địa điểm đang Công khai phải còn ít nhất một bài. Tab **Nhật ký** (phần mở rộng C) liệt kê các thao tác quản trị đã thành công, mới nhất trước, giờ Việt Nam. Không dùng URL tệp cục bộ cho ảnh. Xem bằng chứng và giới hạn nghiệm thu trong [báo cáo bàn giao](../../docs/testing/integration-2026-11-06.md).
