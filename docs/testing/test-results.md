# Kết quả kiểm thử

Kết quả thực tế cho thay đổi WBS-01/WBS-02 trong workspace, ngày 01/11/2026. Python 3.12.15 trên Windows; database dùng file tạm, không dùng database cá nhân. Chưa có commit để gắn phiên bản.

| Ca kiểm thử | Phiên bản | Môi trường / thiết bị | Ngày | Kết quả | Minh chứng / lỗi |
| --- | --- | --- | --- | --- | --- |
| `python -m unittest discover -s backend/tests -v` | Working tree | Python 3.12.15 / Windows | 01/11/2026 | Đạt: 6 test | Khởi tạo lại, kết nối/khóa ngoại, giới hạn tọa độ/bán kính, UNIQUE, RESTRICT/CASCADE, seed lặp và rollback xung đột; kiểm thử entrypoint seed giả lập lời nhắc mật khẩu. |
| Khởi tạo, seed và đọc số lượng trên file tạm | Working tree | Python 3.12.15 / PowerShell | 01/11/2026 | Đạt | 7 bảng; categories=2, pois=5, narrations=6, admin=1; 5 POI nháp. Gọi hàm seed với mật khẩu sinh ngẫu nhiên. |
| Lời nhắc nhập mật khẩu ẩn với người dùng thật | Working tree | PowerShell | 01/11/2026 | Chưa kiểm thử thủ công | Entrypoint đã test với `getpass` giả lập; cần thử tương tác trực tiếp trên máy của người dùng. |
| API Admin UC05/UC06 | Working tree | Python 3.12.15 / Windows / FastAPI TestClient | 01/11/2026 | Đạt: 8 test API; tổng 14 test | Đăng nhập, mật khẩu sai, tài khoản khóa, token thiếu/sai/hết hạn/thu hồi, đăng xuất, chuẩn hóa và CRUD danh mục. Database tạm; mật khẩu test sinh ngẫu nhiên. |
| Uvicorn và HTTP | Working tree | Windows / localhost | 01/11/2026 | Đạt | Database tạm: health 200, đăng nhập 200, danh sách danh mục 200 (2 mục), đăng xuất 204. |
| Web, mobile, GPS, TTS | — | — | 01/11/2026 | Chưa kiểm thử | Chưa triển khai trong phạm vi này; không suy ra kết quả từ kiểm thử API. |
