# Checklist demo 07/11/2026 — Windows 11, PowerShell

**Cập nhật kết quả 07/11/2026:** người dùng xác nhận Admin web và Guest web đều đạt kiểm thử. Mobile đã được xác nhận bản đồ, quyền vị trí, GPS và TTS VI/EN hoạt động ổn; đồng ý/rút đồng ý thống kê trên mobile còn chờ kiểm thử với API thật do lượt thử dùng mock. Xem [kết quả hiện tại](../testing/test-results.md) và [phiếu mobile](../mobile/testing/mobile-field-test.md). Các ô chi tiết dưới đây giữ để bổ sung thông tin và minh chứng từng bước.

Các ô dưới để nhóm ghi sau khi thực hiện, không phải xác nhận nghiệm thu. Nguyên phụ trách Admin/CSDL, An web/thống kê/hiệu năng, Thuận mobile/GPS/TTS. Dùng [biên bản kiểm tra hiện tại](../testing/acceptance-readiness-2026-11-06.md) và [báo cáo tích hợp 06/11](../testing/integration-2026-11-06.md) để phân biệt test giả lập với thiết bị thật.

## Trước buổi demo

- [ ] Ghi `git branch --show-current`, `git rev-parse HEAD`, `git status --short`; nếu còn thay đổi, ghi rõ working tree. Không tự commit/push/merge.
- [ ] Ghi máy/OS, phiên bản Python/Node, browser, điện thoại/OS/Expo, người thử và mạng đang dùng. Kiểm tra giọng VI/EN thực sự có và nghe được; iPhone cần kiểm tra chế độ im lặng/âm lượng.
- [ ] Chọn đường dẫn tuyệt đối database demo được duyệt. Kiểm tra 2 danh mục, ≥5 POI, bài VI/EN, nguồn nội dung/tọa độ/ảnh. Seed hiện có 5 nháp/placeholder/không ảnh, **chưa đáp ứng dữ liệu demo chuẩn**. Upload ảnh tạm gác; chỉ giữ URL ảnh được duyệt hiện có.
- [ ] Dừng writer, [backup và phục hồi thử vào tệp mới](backup-restore.md). Không thử nghiệm trên database cá nhân. Không công bố placeholder để làm đầy danh sách.
- [ ] Chuẩn bị tài khoản Admin riêng, nhập mật khẩu ẩn khi seed database mới; không quay/chụp token, mật khẩu hoặc file `.env`.
- [ ] Kiểm tra `/api/v1/health`, Public list/detail, cổng 8000/5173/5174 và LAN điện thoại. Health chỉ là tiến trình. Nếu schema thiếu, dừng và xử lý trên bản sao; không chạy init/migration tùy tiện.

## Khởi động

DB hiện dùng là `backend/data/saigon_stories.db`; có thể bật cả bốn dịch vụ bằng `powershell -ExecutionPolicy Bypass -File scripts/start-system.ps1` theo [RUNNING](../../RUNNING.md). Các khối chạy riêng sau tương đương, không tạo DB demo mới. Chạy từ gốc repo, mỗi khối ở một cửa sổ PowerShell. Lần cài đầu dùng [RUNNING](../../RUNNING.md) để tạo venv, cài requirements và `npm.cmd ci` riêng từng app. Các lệnh dưới dùng dependency đã cài.

```powershell
$demoDb = (Resolve-Path 'backend/data/saigon_stories.db').Path
if (-not (Test-Path -LiteralPath $demoDb -PathType Leaf)) { throw 'Chưa chọn database' }
$env:SAIGON_DATABASE = (Resolve-Path -LiteralPath $demoDb).Path
.\.venv\Scripts\python.exe backend/scripts/start_demo.py --database $env:SAIGON_DATABASE
```

```powershell
npm.cmd --prefix apps/admin-web run dev
```

```powershell
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
npm.cmd --prefix apps/guest-web run dev
```

Mobile cần cùng LAN tin cậy. Dừng backend loopback bằng Ctrl+C rồi chạy lại với `--host 0.0.0.0`; không mở API demo ra Internet. Cho phép kết nối cổng 8000 trên mạng phát triển phù hợp theo cấu hình máy.

```powershell
.\.venv\Scripts\python.exe backend/scripts/start_demo.py --database $env:SAIGON_DATABASE --host 0.0.0.0
```

Trong cửa sổ mobile, thay IP LAN thật (localhost trên điện thoại là điện thoại):

```powershell
$env:EXPO_PUBLIC_USE_MOCK = 'false'
$env:EXPO_PUBLIC_API_STYLE = 'v1'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://THAY_IP_LAN_MAY_BACKEND:8000/api'
Set-Location apps/mobile
npx.cmd expo start
```

Khởi động lại Expo/Vite sau khi đổi biến chế độ. Không tự chuyển mock khi API lỗi. Nếu trình bày mock, nói rõ và giữ chỉ báo mock; không dùng để chứng minh server/analytics.

## Thứ tự trình bày và tiêu chí quan sát

| Bước | Người chính | Thao tác | Mong đợi / minh chứng cần lưu |
| --- | --- | --- | --- |
| 1. Admin UC05 | Nguyên | Sai mật khẩu rồi đăng nhập đúng tại 5174 | Sai bị từ chối, đúng vào màn hình chính. Không ghi lại mật khẩu/token. |
| 2. UC06–07 | Nguyên | Tạo danh mục/POI riêng cho demo; thử tên trống/trùng, radius 19/1001; lưu POI draft, chưa thêm bài | Validation rõ, dữ liệu đang nhập còn khi lưu lỗi; draft không có trong Public. Không sửa nội dung cá nhân. |
| 3. UC08–09 | Nguyên + An | Với POI demo riêng, thử Công bố khi thiếu bài; thêm bài VI/EN đã duyệt và lưu; xác nhận công bố; Ẩn rồi tải lại Public | Thiếu bài có lý do; published xuất hiện list/detail/map; hidden biến mất và detail 404. Chỉ công bố nội dung đã duyệt. |
| 4. Guest UC01–03 | An + Thuận | 5173 tìm có dấu/hoa thường, kết hợp danh mục, thử rỗng; mở map/marker/detail; chọn bài rồi đổi UI VI/EN | Kết quả đúng, UI độc lập locale bài; map không cần GPS; nghe đúng giọng, Stop/Pause/Resume hoặc Stop/Replay tùy nền tảng. |
| 5. UC10–12 web | An | Chưa chọn/từ chối rồi đồng ý thống kê; xem Dashboard, lọc hôm nay/7 ngày/30 ngày, chờ 30s; rút khi online/offline; mở tab thứ hai | Không UUID/heartbeat trước đồng ý. Khi đồng ý có heartbeat, active là ước lượng. Rút dừng gửi ngay; khi server nhận, active loại ngay, UI kỳ kế tiếp. Khi offline giữ pending và khóa đồng ý lại đến khi revoke thành công. Lỗi hiện Không khả dụng, không giả số 0. |
| 6. Mobile UC01–03/12 | Thuận + An | Xác nhận API thật, tìm/lọc/detail/map, locale/giọng; đồng ý/rút, nền/foreground/mất mạng/mở lại | Đọc văn bản khi thiếu giọng; không phát chồng; heartbeat chỉ foreground/online, pending revoke gửi lại. Ghi điện thoại/OS/giọng/commit và kết quả. |
| 7. GPS UC04 | Thuận | Cấp/từ chối quyền, bật tự phát; vào vùng ≥5s bằng mẫu hợp lệ, ở lại, ra biên, vào lại trước/sau 600s; đưa app xuống nền | Không xin quyền nền, không chồng watcher/phát; accuracy≤min(50m,R/2), mẫu≤15s, không tương lai>1s; ra khi distance>R+max(20m,0.2R). Không phát lại trước cooldown; nền dừng theo dõi. |
| 8. Kết thúc | Cả nhóm | Đăng xuất Admin, thử lại endpoint bảo vệ; chốt bảng kết quả và dừng tiến trình | Token cũ bị từ chối. Chỉ ghi PASS khi thực hiện; đánh dấu phần chưa thử và liên kết video/ảnh đã loại bí mật. |

Không cần chờ dài trong buổi thuyết trình để chứng minh mọi biên GPS/retention: chuẩn bị biên bản thiết bị và video thực tế trước đó; nếu chưa có thì ghi chưa xác minh, không dùng test thời gian giả lập thay thế.

## Khi có sự cố

| Sự cố | Thao tác tiếp tục |
| --- | --- |
| Tile OSM không tải | Web tự thử nguồn OpenStreetMap Deutschland; nếu cả hai nguồn lỗi, sơ đồ vị trí vẫn hiện ghim và có nút Thử lại. Ghi nguồn đang dùng và lỗi mạng, giữ attribution. Nếu cần bản đồ đường phố thật, kiểm tra mạng trước buổi demo; không gọi tile fixture là bản đồ thật. |
| Không có giọng phù hợp/TTS lỗi | Hiển thị thông báo và đọc văn bản; kiểm tra giọng/âm lượng hoặc đổi sang **bài có sẵn** ở ngôn ngữ có giọng. Không tự đổi giọng sai ngôn ngữ hoặc tạo/dịch bài. |
| Mất API/mạng | Hiện lỗi và Thử lại khi kết nối phục hồi. Chỉ dữ liệu đã tải có thể còn để đọc; không có chế độ offline. Không chuyển mock ngầm. |
| GPS không đạt độ chính xác | Giữ app foreground, ra nơi thoáng, kiểm tra quyền; không ép mẫu sai để phát. Dùng nghe thủ công và ghi UC04 chưa xác minh nếu chưa đủ điều kiện. |
| Rút đồng ý chưa tới server | Giữ ứng dụng/bộ nhớ, bật lại mạng và chờ gửi lại 30s. Không xóa dữ liệu ứng dụng/localStorage khi còn pending. |
| Database/schema không đúng | Dừng API, kiểm tra đường dẫn/backup, dùng bản phục hồi tạm đã kiểm tra; không seed lại hoặc migration database đang dùng. |

## Việc nhóm phải chốt trước 07/11

Nguyên duyệt DB/nội dung và hướng dẫn khôi phục; An lưu báo cáo NFR08 cùng môi trường, đối chiếu F01/F10–F12; Thuận hoàn tất [phiếu thiết bị](../mobile/testing/mobile-field-test.md), sơ đồ và video GPS/TTS. Bổ sung thông tin bìa Word còn trống, cập nhật đường dẫn apps/ và các schema/endpoint thực tế. Chưa sửa Word, render lại sơ đồ hoặc sản xuất video trong phiên này.
