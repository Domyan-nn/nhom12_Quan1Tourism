# Web Admin

Ứng dụng React/Vite dành cho Admin; xem [hướng dẫn chạy](../../RUNNING.md). Vite dùng cổng 5174 và chuyển `/api` đến `http://127.0.0.1:8000`. Token Admin chỉ giữ trong bộ nhớ trang và bị mất khi tải lại; cần đăng xuất để thu hồi phiên phía server.

Web khách là ứng dụng riêng tại [apps/guest-web](../guest-web/README.md).
# Quản lý địa điểm và thuyết minh

Sau khi đăng nhập, chọn địa điểm để xem/sửa hoặc dùng nút thêm. Nhập tên, địa chỉ, danh mục, tọa độ, bán kính và URL ảnh HTTP(S) tùy chọn; địa điểm mới luôn là draft. Xóa yêu cầu xác nhận và xóa các bài liên quan. Chọn địa điểm để thêm bài bằng mã ngôn ngữ (ví dụ `vi`, `en`, `fr`) hoặc sửa tiêu đề và nội dung. Ngôn ngữ giao diện VI/EN độc lập với ngôn ngữ bài. Dữ liệu nhập được giữ khi lưu thất bại trong phiên trang.

Chưa có upload tệp ảnh, xóa riêng bài thuyết minh hay công bố/ẩn địa điểm. Không dùng URL tệp cục bộ.
