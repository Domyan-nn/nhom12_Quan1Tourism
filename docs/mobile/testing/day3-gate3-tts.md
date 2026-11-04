# Ngày 3 (03/11/2026) – Lê Nam Thuận: UC03 trên guest-web và mobile

Việc theo timeline: hoàn thiện chọn ngôn ngữ và nghe thuyết minh (UC03) trên guest-web (Web Speech API) và mobile-app (Expo Speech); kiểm tra giọng đọc và báo lỗi khi thiếu giọng (BR05); nếu thiết bị không tạm dừng được thì dừng hoặc phát lại (UC03-E2).

## Hiện trạng

| Nền tảng | Trạng thái | Chưa xác minh |
| --- | --- | --- |
| guest-web | Nút Nghe trước đây bị vô hiệu hóa (`TODO WBS-11`). Nay có `WebSpeechPlayer` (`src/tts/`) và `TtsControls`: Nghe, Tạm dừng, Tiếp tục, Dừng, Phát lại | Chạy trên Chrome/Edge/Firefox thật, giọng tiếng Việt trên từng máy |
| mobile-app | UC03 đã có (`NarrationPlayer`, `NarrationPanel`), BR05 chặt: không xác nhận được giọng thì báo lỗi, không dùng giọng khác | Chạy trên Android/iOS thật |

## Hành vi cần nhớ khi thử

- **BR05:** trình duyệt/thiết bị không có giọng đúng ngôn ngữ thì **không đọc**, báo lỗi và vẫn hiện văn bản. Máy không cài giọng tiếng Việt sẽ báo lỗi dù nút Nghe bấm được: đây là đúng yêu cầu, không phải lỗi.
- **Chrome** nạp danh sách giọng chậm; player chờ tối đa 1,5 giây. Chrome còn tự dừng khi đọc một câu quá dài, nên bài được đọc theo từng đoạn ngắn (khoảng 180 ký tự).
- **UC03-E2:** nếu trình duyệt không tạm dừng được, player dừng hẳn và hiện thông báo; khách bấm Phát lại để nghe từ đầu. Android (mobile) cũng không có Tạm dừng, chỉ có Dừng và Nghe lại.
- Đổi ngôn ngữ, đổi địa điểm hoặc rời trang thì dừng đọc.

## Kiểm thử tự động

`apps/guest-web/tests/webSpeechPlayer.test.js` – 13 ca: khớp giọng theo ngôn ngữ, giọng nạp muộn, thiếu giọng (NO_VOICE), trình duyệt không hỗ trợ, văn bản rỗng, lỗi engine, không bắt đầu đọc (quá thời gian), tạm dừng/tiếp tục, không hỗ trợ tạm dừng, dừng và đổi bài, chia đoạn. Chạy: `npm.cmd test` trong `apps/guest-web`.

Bổ sung kiểm chứng 04/11/2026: giữ 13 ca gốc, thêm 5 ca lỗi engine/vòng đời (tổng 18 ca player; tổng guest Node 25 + Vitest 20). Edge kiểm thử điều khiển với giọng giả cùng FastAPI/SQLite tạm; không nghe âm thanh thật. Mobile thêm 12 ca engine và 4 ca NarrationPanel, tổng Jest 83 pass + 2 HTTP skip khi chưa chọn fixture; khi bật API fixture riêng đạt 85/85. Export Android thành công, chưa cài native. Chi tiết lệnh, môi trường và giới hạn ở [báo cáo tích hợp](../../testing/integration-2026-11-04.md).

Mobile chọn ngôn ngữ từ bài thực có trong dữ liệu (kể cả ngoài VI/EN), vẫn báo thiếu nếu lựa chọn trước đó không có bài; không tự đổi bài theo UI. Player đợi native Stop trước khi đọc bài mới, xử lý lỗi pause/resume iOS và timeout từng đoạn. Android vẫn chỉ Dừng/Nghe lại. Không thêm GPS nền hoặc offline.

## Phiếu thử thủ công Gate 3 (TTS)

Cần địa điểm đã công bố và có bài tiếng Việt và tiếng Anh, hoặc chạy chế độ mock. **Cột kết quả để trống đến khi thử thật.**

Ngày 04/11/2026: **chưa kiểm thử âm thanh thật và điện thoại/emulator**; không dùng kết quả engine giả để điền bảng dưới. Mỗi lượt Thuận cần ghi: người thử, ngày giờ, hash mã, thiết bị/model, Android/iOS và phiên bản, trình duyệt/Expo build, locale bài, tên/mã giọng đã cài, có nghe trực tiếp hay không, kết quả và lỗi. Thử cả bài dài, dừng trước lúc bắt đầu, đổi nhanh địa điểm/ngôn ngữ, rời màn hình và thiếu giọng. iOS cần thử pause/resume; Android xác nhận chỉ Stop/Replay. Dùng fixture SQLite riêng theo RUNNING, không công bố nội dung chưa duyệt.

| # | Nền tảng | Bước | Mong đợi | Kết quả |
| --- | --- | --- | --- | --- |
| 1 | Web | Mở chi tiết, chọn Tiếng Việt, bấm Nghe | Đọc bằng giọng tiếng Việt | |
| 2 | Web | Chọn English, bấm Nghe | Đọc bằng giọng tiếng Anh | |
| 3 | Web | Đang đọc, bấm Tạm dừng rồi Tiếp tục | Tạm dừng và tiếp tục đúng chỗ | |
| 4 | Web | Đang đọc, bấm Dừng | Dừng ngay, nút về Nghe | |
| 5 | Web | Đang đọc, đổi ngôn ngữ | Dừng bài cũ, không đọc chồng | |
| 6 | Web | Trình duyệt/máy không có giọng tiếng Việt | Báo thiếu giọng; văn bản vẫn hiện | |
| 7 | Web | Trình duyệt không tạm dừng được | Dừng hẳn, báo, Phát lại được | |
| 8 | Web | Đọc bài dài | Không tự dừng giữa chừng | |
| 9 | Mobile | Chọn ngôn ngữ, bấm Nghe | Đọc đúng ngôn ngữ | |
| 10 | Mobile | Ngôn ngữ chưa có bài | Báo thiếu, không đổi ngầm | |
| 11 | Mobile | Máy thiếu giọng tiếng Việt | Báo lỗi, văn bản vẫn hiện | |
| 12 | Android | Đang đọc | Không có Tạm dừng; có Dừng và Nghe lại | |
| 13 | iOS | Đang đọc, Tạm dừng rồi Tiếp tục | Hoạt động | |
