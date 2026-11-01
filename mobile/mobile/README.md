# Mobile – Saigon Stories Quận 1 (React Native / Expo)

Ứng dụng di động cho khách, phụ trách: **Lê Nam Thuận**. Phạm vi: UC02 (bản đồ), UC03 (ngôn ngữ + TTS), UC04 (tự phát theo GPS), cùng giao diện UC01 và UC12 trên mobile.

## Trạng thái (01/11/2026)

| Hạng mục | Trạng thái |
| --- | --- |
| Logic BR08 (xác nhận 5 giây, 600 giây, chọn gần nhất, không phát chồng) | Có code + 20 test đơn vị, **chạy đạt** |
| Logic TTS BR05 (chọn giọng, báo lỗi, chia đoạn dài) và UC12 (đồng ý/rút/thử lại) | Có code + 16 test đơn vị, **chạy đạt** |
| Giao diện (Khám phá, Chi tiết, Bản đồ, Tự phát, Riêng tư) | Đã viết, **kiểm tra cú pháp đạt; CHƯA chạy trên Expo/thiết bị** |
| Kết nối API thật | Chưa thử (backend `main` chưa có route analytics và danh sách POI chưa kèm `narrations`) |
| GPS/TTS/bản đồ trên máy thật (NFR07) | **Chưa kiểm thử** – xem `docs/testing/mobile-field-test.md` |

> Các test đã chạy bằng bộ chạy Node tự viết vì môi trường tạo code không có mạng để cài `jest`. Hãy chạy lại bằng `npm test` trên máy nhóm.

## Cài đặt và chạy

Cần Node.js 20.19+ / 22.12+, và ứng dụng **Expo Go** trên điện thoại (hoặc Android Studio / Xcode).

```powershell
cd mobile
npm run setup        # = npm install --legacy-peer-deps && npx expo install --fix
copy .env.example .env
npx expo start
```

`package.json` khai báo phiên bản `*` cho các thư viện native để lệnh `npx expo install --fix` chọn **đúng phiên bản khớp Expo SDK** đang dùng (repo này đặt `expo ~56.0.0`). Sau lần cài đầu, hãy commit `package.json` và `package-lock.json` đã được ghi số phiên bản cụ thể. Nếu Expo Go báo SDK không khớp, đổi số `expo` trong `package.json` cho đúng SDK Expo Go hỗ trợ rồi chạy lại `npm run setup`.

### Chế độ dữ liệu

| Biến `.env` | Ý nghĩa |
| --- | --- |
| `EXPO_PUBLIC_USE_MOCK=true` (mặc định) | Dùng dữ liệu giả lập 5 địa điểm, giống guest-web; không gọi mạng, không gửi thống kê. Một thanh thông báo hiện ở màn Khám phá. |
| `EXPO_PUBLIC_USE_MOCK=false` | Gọi API thật. |
| `EXPO_PUBLIC_API_BASE_URL` | Ví dụ `http://192.168.1.10:8000/api`. Bỏ trống thì tự lấy IP máy chạy `expo start` + cổng 8000. Điện thoại thật **không** dùng được `localhost`. Backend phải chạy với `--host 0.0.0.0`. |
| `EXPO_PUBLIC_API_STYLE` | `v1` (backend hiện tại: `/api/v1/pois`, phản hồi `{"items": [...]}`) hoặc `contract` (`docs/API_CONTRACT.md`: `/api/public/pois`, phản hồi là mảng). |

Backend `main` hiện **khác** `API_CONTRACT.md` (tiền tố `/api/v1` thay vì `/api/public`, phản hồi bọc `items`, danh sách chưa kèm `narrations`). Mobile xử lý được cả hai; khi chưa có `narrations` trong danh sách, ứng dụng tự gọi chi tiết từng địa điểm khi cần. Nhóm cần chốt một kiểu (mục 12 của API_CONTRACT).

## Cấu trúc

```text
mobile/
├─ App.js, index.js, app.json, babel.config.js, package.json
├─ src/
│  ├─ config.js                    # URL API, chế độ mock
│  ├─ services/                    # apiClient, publicApi (IAppAPI), analyticsApi, mockData
│  ├─ context/                     # DataContext (dữ liệu đã tải, NFR02), SettingsContext (ngôn ngữ)
│  ├─ navigation/AppNavigator.js   # 4 tab + màn chi tiết
│  ├─ components/                  # PoiCard, StateViews (loading/lỗi/rỗng, nút, chip)
│  └─ features/
│     ├─ places/      ExploreScreen, PoiDetailScreen        (UC01)
│     ├─ map/         MapScreen                              (UC02, IMap)
│     ├─ narration/   NarrationPlayer, NarrationPanel, narrationUtils (UC03, ITTS)
│     ├─ location/    autoPlayEngine, geo, AutoPlayContext, AutoPlayScreen (UC04, ILocation)
│     └─ privacy/     AnalyticsClient, PrivacyContext, PrivacyScreen, ConsentModal (UC12)
└─ tests/             # location/, narration/, privacy/
```

Logic nghiệp vụ nằm trong các lớp thuần (`autoPlayEngine`, `NarrationPlayer`, `AnalyticsClient`, `narrationUtils`) nhận phụ thuộc qua tham số, nên kiểm thử được mà không cần thiết bị.

## Cách hiện thực các quy tắc

- **BR01** – chỉ dùng dữ liệu từ API công khai; điểm bị ẩn (404) bị loại khỏi bộ nhớ và báo "không còn khả dụng" (UC02-E2).
- **BR03** – chỉ hiển thị ngôn ngữ có nội dung; chọn ngôn ngữ thiếu bài thì báo thiếu, không đổi ngầm (UC03-A1).
- **BR05** – dùng giọng có mã ngôn ngữ khớp; không có giọng hoặc lỗi thì báo lý do và vẫn hiện văn bản, **không** dùng giọng sai ngôn ngữ. Android không hỗ trợ tạm dừng của `expo-speech` nên chỉ có Dừng/Nghe lại (UC03-E2).
- **BR07** – GPS chỉ theo dõi khi khách bật, đã cấp quyền và ứng dụng ở foreground; ứng dụng ẩn thì gỡ theo dõi. Tọa độ chỉ nằm trong bộ nhớ tạm của engine, không ghi đĩa, không gửi đi, nhật ký không chứa tọa độ.
- **BR08** – hiện thực trong `autoPlayEngine.js` (hằng số ở `RULES`).
- **BR13–BR15, BR18** – `AnalyticsClient`: chưa đồng ý/từ chối thì không tạo mã và không gọi API; heartbeat 30 giây chỉ khi hiển thị + có mạng; rút đồng ý dừng gửi ngay và giữ mã để gửi lại yêu cầu rút đến khi nhận 204 (UC12-E1).
- **NFR02** – bản đồ/GPS/TTS/API lỗi đều có thông báo; danh sách và nội dung đã tải vẫn dùng được.

## Điểm cần nhóm xác nhận (diễn giải của mình)

1. **"Ra rồi vào lại sau ít nhất 600 giây" (BR08)**: hiện hiểu là *có ra khỏi vùng* và thời điểm vào lại cách lần phát thành công trước **≥ 600 giây**. Nếu nhóm hiểu là "ở ngoài vùng ≥ 600 giây", đổi điều kiện trong `autoPlayEngine.js` (và test "ra rồi vào lại").
2. **Tính "liên tục" 5 giây**: nếu hai mẫu hợp lệ liền nhau cách nhau > 15 giây thì đếm lại từ đầu (`RULES.MAX_GAP_MS`). PRD không nói rõ; đây là giả định.
3. **Mẫu không có `accuracy`** bị bỏ (không xác minh được sai số).
4. **`voices` rỗng trên một số máy Android**: khi không liệt kê được giọng, ứng dụng vẫn thử phát với mã ngôn ngữ và dựa vào lỗi TTS. Cần thử trên máy thật.
5. **Bản đồ**: dùng `react-native-maps`. Expo Go chạy được; bản build riêng trên Android cần khóa Google Maps (`android.config.googleMaps.apiKey` trong `app.json`) – **không** commit khóa lên Git.
6. Giao diện chỉ có tiếng Việt; ngôn ngữ chọn được chỉ áp dụng cho *thuyết minh*.

## Chạy kiểm thử

```powershell
npm test
```
