# Ảnh demo và ghi công

Cập nhật 09/11/2026. Năm địa điểm demo dùng ảnh từ Wikimedia Commons, liên kết trực tiếp bản thu nhỏ rộng 1280 px; repo không lưu tệp ảnh. Script [`backend/scripts/add_demo_images.py`](../../backend/scripts/add_demo_images.py) chỉ điền `image_url` còn trống, không đổi trạng thái hoặc nội dung.

| Địa điểm | Tác giả | Giấy phép | Trang nguồn |
| --- | --- | --- | --- |
| Dinh Độc Lập | Balon Greyjoy | CC0 1.0 | [File:20190923 Independence Palace-10.jpg](https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-10.jpg) |
| Nhà thờ Đức Bà | Diego Delso | CC BY-SA 3.0 | [File:Basílica de Nuestra Señora… DD 03.JPG](https://commons.wikimedia.org/wiki/File:Bas%C3%ADlica_de_Nuestra_Se%C3%B1ora,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_03.JPG) |
| Bưu điện Trung tâm | Kevin Rutherford | CC BY-SA 2.0 | [File:Saigon Central Post Office (52681461470).jpg](https://commons.wikimedia.org/wiki/File:Saigon_Central_Post_Office_(52681461470).jpg) |
| Chợ Bến Thành | Diego Delso | CC BY-SA 3.0 | [File:Ben Thanh… DD 01.JPG](https://commons.wikimedia.org/wiki/File:Ben_Thanh,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_01.JPG) |
| Nhà hát Thành phố | Jorge Láscar | CC BY 2.0 | [File:Lascar Municipal Theatre (4608017466).jpg](https://commons.wikimedia.org/wiki/File:Lascar_Municipal_Theatre_(4608017466).jpg) |

Giấy phép lấy từ metadata Commons ngày 09/11/2026. CC BY và CC BY-SA yêu cầu ghi tác giả, giấy phép và nguồn khi trình bày ảnh: đưa bảng này vào báo cáo và slide. Từ 09/11 ghi công được lưu ở cột `pois.image_credit` (migration 004) và hiện dưới ảnh ở trang chi tiết web và mobile; script trên điền ghi công cho 5 ảnh này. DB chính đã được điền ngày 09/11 (bản trước: `backups/before-image-credits-20261109T143253Z.db`).

## Chạy lại trên database khác

```powershell
.\.venv\Scripts\python.exe backend/scripts/add_demo_images.py --database <db>
.\.venv\Scripts\python.exe backend/scripts/add_demo_images.py --database <db> --apply --backup backups/before-demo-images-<thoi-gian>.db
```

Lệnh đầu chỉ xem trước. Lệnh thứ hai tạo bản sao lưu mới (từ chối nếu tệp đã tồn tại), kiểm tra toàn vẹn rồi mới ghi. Phục hồi theo [backup-restore](backup-restore.md).

DB chính đã được áp dụng ngày 09/11/2026; bản trước khi gắn ảnh: `backups/before-demo-images-20261109T042625Z.db`.

Ảnh tải từ máy chủ Wikimedia khi khách mở trang, nên cần Internet. Trong lúc kiểm tra, một yêu cầu liên tiếp bị trả `429 Too Many Requests` rồi tải lại được; nếu demo ở mạng yếu, mở trước các trang để trình duyệt lưu đệm.
