# Dữ liệu mẫu và Admin demo

Xem [hướng dẫn PowerShell](../README.md) để khởi tạo một database riêng và chạy seed. Script dùng duy nhất thư viện chuẩn Python. Tên Admin truyền bằng `--username`; mật khẩu nhập trực tiếp khi có lời nhắc và không hiển thị. Không đưa mật khẩu vào lệnh, lịch sử PowerShell, Git hoặc tài liệu. Dùng mật khẩu riêng cho demo, không tái sử dụng mật khẩu thật.

Seed tạo 2 danh mục, 5 địa điểm nháp và 6 bài placeholder (một địa điểm có `vi` và `en`), cùng một Admin demo. Tất cả nội dung, địa chỉ và tọa độ chỉ là mẫu chưa kiểm duyệt hoặc xác minh; không có ảnh, nguồn hoặc khẳng định về quyền sử dụng ảnh. Nguyên và An cần bổ sung nguồn, kiểm tra nội dung, địa chỉ, tọa độ và quyền sử dụng ảnh trước khi công bố. Các bản ghi mẫu mặc định `draft`; hợp đồng dự kiến chỉ hiển thị `published` cho khách, do đó seed không tạo dữ liệu công khai.

Danh sách cần xác minh cho từng địa điểm: Dinh Độc Lập, Nhà thờ Đức Bà, Bưu điện Trung tâm, Chợ Bến Thành và Nhà hát Thành phố: địa chỉ chính xác, tọa độ, nội dung thuyết minh và nguồn đáng tin cậy. Cả năm chưa có ảnh; cần tìm nguồn ảnh và xác minh quyền sử dụng trước khi thêm. Không xem tên địa điểm hoặc tọa độ minh họa trong seed là bằng chứng đã kiểm duyệt.

ID ổn định giúp chạy lại không tạo bản ghi mẫu trùng; bản ghi đã tồn tại, kể cả tài khoản và mật khẩu, không bị cập nhật. Nếu tên danh mục/địa điểm hoặc username trùng một bản ghi khác ID, script báo lỗi và rollback toàn bộ thay vì nhập đè; cần tự xem xét database trước khi xử lý. Một bài có cùng POI và locale cũng được giữ nguyên. Chạy lại không phải cơ chế đặt lại mật khẩu hoặc đồng bộ nội dung.

Mật khẩu được lưu theo `pbkdf2_sha256$iterations$base64(salt)$base64(hash)` với salt ngẫu nhiên và 600.000 vòng PBKDF2-HMAC-SHA256. API đăng nhập hiện xác minh định dạng này và tạo phiên 8 giờ; nhóm vẫn cần thống nhất chính sách mật khẩu, cách lưu token phía web và giới hạn đăng nhập trước khi triển khai thật. Không dùng tài khoản demo cho môi trường thật.
