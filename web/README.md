# Web Admin

Ứng dụng React/Vite dành cho Admin; xem [README gốc](../README.md) để cài và chạy cùng FastAPI. Vite dùng cổng 5174 và chuyển `/api` đến `http://127.0.0.1:8000`. Token Admin chỉ giữ trong bộ nhớ trang và bị mất khi tải lại; cần đăng xuất để thu hồi phiên phía server.

Web khách là ứng dụng riêng tại [guest-web/](guest-web/README.md), có cấu hình và lệnh chạy riêng. API thật của web khách hiện chưa khớp với backend; xem README gốc để biết trạng thái.
