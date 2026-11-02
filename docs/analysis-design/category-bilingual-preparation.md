# Danh mục tiếng Việt và tiếng Anh

`categories.name` là tên tiếng Việt; `name_en` là tên tiếng Anh. API công khai và API quản trị trả cả hai trường. Admin phải nhập đủ hai tên khi tạo hoặc sửa; mỗi tên được trim, chuẩn hóa NFC và kiểm tra trùng riêng theo ngôn ngữ. Guest web hiển thị tên theo ngôn ngữ giao diện và giữ nguyên ID khi lọc. Nếu bản ghi cũ chưa có tên tiếng Anh, giao diện khách dùng tên tiếng Việt và Admin hiển thị trạng thái thiếu bản dịch.

Database mới được `init_db.py` bổ sung các cột. Với database cũ, dừng mọi tiến trình ghi trước khi chạy:

```powershell
.\.venv\Scripts\python.exe backend/scripts/prepare_category_bilingual.py --database <database> --check
.\.venv\Scripts\python.exe backend/scripts/prepare_category_bilingual.py --database <database> --backup <backup-moi>
```

Lệnh `--check` kiểm tra trên bản chụp trong bộ nhớ; khi áp dụng, backup SQLite phải là đường dẫn mới. Migration chạy trong giao dịch, kiểm tra toàn vẹn và giữ nguyên ID, liên kết POI cùng tên cũ. Nó không tự dịch dữ liệu có sẵn; Admin cần bổ sung tên tiếng Anh. Script từ chối schema không đúng hoặc đã nâng cấp. Nếu cần nâng cấp analytics, chạy riêng theo hướng dẫn backend. Seed chỉ thêm các bản dịch mẫu cho danh mục mới, không cập nhật các bản ghi đã có. Mobile chưa đổi giao diện ngôn ngữ theo thay đổi này.
