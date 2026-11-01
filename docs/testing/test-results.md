# Kết quả kiểm thử

Kết quả thực tế cho thay đổi WBS-01/WBS-02 trong workspace, ngày 01/11/2026. Python 3.12.15 trên Windows; database dùng file tạm, không dùng database cá nhân. Chưa có commit để gắn phiên bản.

| Ca kiểm thử | Phiên bản | Môi trường / thiết bị | Ngày | Kết quả | Minh chứng / lỗi |
| --- | --- | --- | --- | --- | --- |
| `python -m unittest discover -s backend/tests -v` | Working tree | Python 3.12.15 / Windows | 01/11/2026 | Đạt: 6 test | Khởi tạo lại, kết nối/khóa ngoại, giới hạn tọa độ/bán kính, UNIQUE, RESTRICT/CASCADE, seed lặp và rollback xung đột; kiểm thử entrypoint seed giả lập lời nhắc mật khẩu. |
| Khởi tạo, seed và đọc số lượng trên file tạm | Working tree | Python 3.12.15 / PowerShell | 01/11/2026 | Đạt | 7 bảng; categories=2, pois=5, narrations=6, admin=1; 5 POI nháp. Gọi hàm seed với mật khẩu sinh ngẫu nhiên. |
| Lời nhắc nhập mật khẩu ẩn với người dùng thật | Working tree | PowerShell | 01/11/2026 | Chưa kiểm thử thủ công | Entrypoint đã test với `getpass` giả lập; cần thử tương tác trực tiếp trên máy của người dùng. |
| API, đăng nhập, web, mobile, GPS, TTS | — | — | 01/11/2026 | Chưa kiểm thử | Chưa triển khai trong phạm vi này; không suy ra kết quả từ kiểm thử SQLite. |
