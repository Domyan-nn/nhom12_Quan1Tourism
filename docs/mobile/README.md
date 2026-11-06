# Mobile

Ứng dụng React Native/Expo cho khách nằm tại [apps/mobile](../../apps/mobile/README.md). Mã GPS và quy tắc tự phát trong foreground nằm tại `apps/mobile/src/features/location/`. Hướng dẫn cài đặt, cấu hình API và giới hạn kiểm thử nằm trong README ứng dụng; kiểm thử thiết bị thật vẫn chưa được thực hiện.

Thư mục này giữ [checklist kiểm thử thực địa](testing/mobile-field-test.md) cùng sơ đồ nguồn và các bản xuất trong `diagrams/architecture/` trước đây nằm dưới `mobile/docs/`.

Đợt [bàn giao 06/11](../testing/integration-2026-11-06.md) đã kiểm HTTP thật UC12 trên SQLite tạm và sửa pending revoke/retry/storage cùng validation mẫu GPS; không dùng kết quả đó làm bằng chứng thiết bị thực địa. [Checklist demo 07/11](../deployment/demo-guide.md) ghi cách chạy LAN và phương án khi mạng/giọng không sẵn có.

[Checklist Gate 2](testing/day2-gate2-mobile.md) được chuyển từ phần code lệch thư mục của Thuận; [báo cáo tích hợp 03/11](../testing/gate2-integration-2026-11-03.md) phân biệt rõ test giả lập, API thật và phần thiết bị chưa kiểm thử.
