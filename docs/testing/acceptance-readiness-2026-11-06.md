# Kiểm thử nghiệm thu kỹ thuật và chuẩn bị bước tiếp theo — 06/11/2026

Phiên bản kiểm tra: `main` tại `4723a49` (`test hệ thống và fix web`), working tree sạch trước khi cập nhật biên bản này. Người chạy: Codex trên Windows 11, Python `.venv`, Node/npm và Microsoft Edge. Đây là kết quả kiểm thử kỹ thuật; chưa có biên bản ký nghiệm thu của nhóm hoặc kiểm thử thực địa trên điện thoại.

## Kết quả xác nhận trên phiên bản hiện tại

| Phạm vi | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| Backend FastAPI/SQLite | **89/89 đạt**, exit 0 | `python -m unittest discover -s backend/tests`; các test dùng database tạm. |
| Guest web | **25 Node + 20 Vitest đạt**, exit 0 | `npm test -- --configLoader runner`; kiểm logic, API client, TTS và quyền riêng tư bằng fixture/giả lập. |
| Admin và guest web build | **Cả hai đạt**, exit 0 | Vite build trên commit hiện tại. |
| Edge tích hợp | **37 đạt, 1 bỏ qua theo cấu hình**, exit 0 | Chạy 4 dịch vụ test với FastAPI/SQLite tạm và config Playwright không tự quản lý server. Ca bỏ qua là chẩn đoán mạng OSM thật, không phải ca chức năng. |
| Mobile Jest + HTTP fixture | **120/120 đạt**, exit 0 | Bật `SAIGON_TEST_API_URL=http://127.0.0.1:18083/api` và `SAIGON_TEST_FIXTURE=gate2` với FastAPI/SQLite tạm. Lượt mặc định trước đó đạt 116 ca, bỏ qua 4 ca HTTP theo cấu hình. Native map, GPS và âm thanh vẫn dùng giả lập trong Jest. |
| Bản đồ guest `/map` | **Đạt trên máy kiểm tra** | Edge tải 12 ảnh nền từ OpenStreetMap Deutschland, hiện 4 ghim từ API thật và không có cảnh báo. Nguồn OSM chính bị từ chối kết nối nên web tự chuyển nguồn; 13/13 ca `map.spec.js` đạt trong bộ Edge. Khi cả hai nguồn không truy cập được, sơ đồ vị trí vẫn hiện ghim. |

Bộ Edge mặc định với Playwright tự khởi động server đã chạy tới ca 38/38 nhưng kẹt lúc dừng server; lượt đó được ngắt và **không tính là PASS**. Lượt có bốn dịch vụ test riêng ở bảng trên đã hoàn tất với exit 0; [mục 5 của báo cáo tích hợp](integration-2026-11-06.md) ghi cách tái lập cấu hình này. Tệp config tạm được xóa, các dịch vụ fixture đã dừng. NFR08 và sao lưu/phục hồi giữ kết quả [bàn giao tích hợp 06/11](integration-2026-11-06.md): 20/20 HTTP dưới 3 giây và khôi phục SQLite tạm thành công; chúng không được chạy lại ở lượt này.

## Kết luận nghiệm thu và chuyển bước

**Đạt kiểm thử tự động cho backend, Admin web và guest web trên phiên bản hiện tại.** Các luồng tìm/lọc/chi tiết, CRUD và công bố/ẩn, thống kê theo đồng ý, bản đồ web và các trạng thái lỗi đã có bằng chứng API/browser. Có thể chuyển sang chuẩn bị demo và kiểm thử hiện trường theo [checklist 07/11](../deployment/demo-guide.md).

**Chưa nghiệm thu toàn bộ sản phẩm.** Phần mobile mới đạt logic/Jest và HTTP fixture ở mốc trước; chưa có bằng chứng trên điện thoại cho bản đồ native, quyền vị trí, GPS thực địa, giọng và âm thanh thật. Seed hiện vẫn là bản nháp với nội dung placeholder, chưa có ảnh được duyệt; cài mới toàn hệ thống trên máy khác, Word/sơ đồ/video và xác nhận của từng thành viên cũng chưa hoàn tất. Bảng F01–F12/NFR01–NFR08 trong [báo cáo gốc](integration-2026-11-06.md) là lịch sử trước khi sửa nguồn tile web; riêng F02 web nay đã tải được bản đồ thật trên máy kiểm tra, nhưng F02 toàn hệ thống vẫn chờ native map.

| Bước tiếp theo | Điều kiện hoàn tất |
| --- | --- |
| Thử mobile thực tế — Thuận, An hỗ trợ UC12 | Điền [phiếu thiết bị](../mobile/testing/mobile-field-test.md): máy/OS, mạng LAN, native map/GPS, quyền foreground, TTS VI/EN, đồng ý/rút thống kê và bằng chứng. |
| Chuẩn bị dữ liệu demo — Nguyên, An | Duyệt nguồn nội dung, tọa độ, bản dịch và URL ảnh; sao lưu/khôi phục thử trước khi công bố. Không dùng seed placeholder làm nội dung nghiệm thu. |
| Hoàn tất bàn giao — cả nhóm | Chạy checklist demo, đối chiếu F/NFR còn thiếu, cập nhật Word/sơ đồ/video và ghi người duyệt cùng kết quả thực tế. |

Hướng dẫn chạy và lệnh tái lập nằm trong [RUNNING.md](../../RUNNING.md). Kết quả này chỉ áp dụng cho commit và môi trường nêu trên; một lần chạy lại trên máy khác cần ghi bằng chứng mới.
