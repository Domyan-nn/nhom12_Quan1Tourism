# Minh chứng kiểm thử

Ảnh, video và log chứng minh các ca thủ công hoặc ca thực địa đã chạy thật. Mỗi tệp phải gắn được với một mã ca trong [test-cases.md](../test-cases.md) hoặc [phiếu thực địa mobile](../../mobile/testing/mobile-field-test.md).

## Đặt tên

```
<mã-ca>_<mô-tả-ngắn-không-dấu>_<yyyymmdd>.<jpg|png|mp4>
```

Ví dụ: `FT-24_gan-toi-cho-phep_20261114.mp4`, `FT-27_ghi-cong-anh_20261114.jpg`, `NFR06_cai-moi-may-an_20261114.png`.

Một tệp chứng minh nhiều ca thì nối mã bằng dấu cộng: `FT-13+FT-14_cooldown_20261114.mp4`.

## Dung lượng

- Ảnh và video **dưới 20 MB** thì đưa vào thư mục này qua PR.
- Video lớn hơn thì để trên Google Drive của nhóm (chế độ "ai có link đều xem được"), rồi ghi link vào cột *Minh chứng* của phiếu và vào bảng dưới đây.

## Không được có trong ảnh, video, log

- Mật khẩu, token (`access_token`, header `Authorization`), mã phiên thống kê (UUID trong localStorage/AsyncStorage).
- Mặt hoặc thông tin của người qua đường; biển số xe.
- Màn hình có thông báo cá nhân (tin nhắn, email).

## Ghi kèm mỗi lượt thử

Điền ở bảng thiết bị của phiếu thực địa: model và hệ điều hành, phiên bản Expo Go, commit đã chạy, ngày giờ, người thử, giọng TTS đã dùng.

## Danh sách minh chứng

| Tệp hoặc link | Mã ca | Ngày | Người thử | Ghi chú |
| --- | --- | --- | --- | --- |
| | | | | |
