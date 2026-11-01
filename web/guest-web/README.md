# guest-web (Saigon Stories – Web khách)

React + Vite + React Router. Thư mục trong monorepo: `web/guest-web/`.

## Chạy
```bash
npm install
cp .env.example .env     # VITE_USE_MOCK=true: dùng dữ liệu giả lập
npm run dev              # http://localhost:5173
npm run build            # kiểm tra build
```
Khi saigon-api sẵn sàng: đặt `VITE_USE_MOCK=false`. Vite chuyển tiếp `/api` tới `http://localhost:8000`.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `src/App.jsx` | Router: `/`, `/poi/:id`, `/map`, `/privacy` |
| `src/components/AppLayout.jsx` | Header, điều hướng (xuống đáy màn hình ≤ 640px), `#consent-slot` |
| `src/components/StateViews.jsx` | Loading / Empty / Error có nút Thử lại (NFR04) |
| `src/api/publicApi.js` | `listCategories`, `listPois`, `getPoi` (mock hoặc API thật) |
| `src/pages/ExplorePage.jsx` | UC01: tìm theo tên + lọc danh mục |
| `src/pages/PoiDetailPage.jsx` | Chi tiết và chọn ngôn ngữ có nội dung |

## Điểm gắn cho các WBS khác
- WBS-08 (UC12): banner đồng ý vào `#consent-slot`, nút Đồng ý / Rút đồng ý vào `PrivacyPage`.
- WBS-10 (UC02): MapView vào `#map-slot` trong `MapPage`.
- WBS-11 (UC03): TTS Player thay nút "Nghe thuyết minh" trong `PoiDetailPage`.

## API công khai mà khung này đang gọi (cần chốt trong API contract)
- `GET /api/public/categories` → `[{id, name}]`
- `GET /api/public/pois?q=&category_id=` → `[{id, category_id, name, address, latitude, longitude, radius_m, image_url, narrations:[{locale,title,body}]}]`
- `GET /api/public/pois/{id}` → một địa điểm như trên, 404 nếu không còn Công khai
