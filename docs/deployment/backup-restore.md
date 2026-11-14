# Sao lưu và phục hồi SQLite — Windows/PowerShell

Chạy từ gốc repo, dùng Python `.venv`. Người vận hành chọn database **đã được nhóm duyệt**. Trong phiên kiểm thử 06/11 chỉ dùng SQLite tạm; chưa thao tác database cá nhân hoặc bản sao lưu thật.

## Chọn đúng nguồn và dừng tiến trình

1. Ghi đường dẫn tuyệt đối, thời điểm, commit và mục đích của database. Không suy ra database demo chỉ từ tên tệp hoặc biến môi trường của cửa sổ khác.
2. Dừng Uvicorn và mọi tiến trình có thể ghi database bằng `Ctrl+C` tại cửa sổ của chúng; chờ tiến trình thoát. Đóng công cụ SQLite đang sửa dữ liệu. Trang web/mobile cũng không tiếp tục thao tác ghi trong thời gian này.
3. Không chép riêng tệp `.db` khi còn writer/WAL. Script dưới dùng SQLite Backup API để lấy snapshot hợp lệ, kể cả dữ liệu WAL đã commit. Dừng writer vẫn giúp việc sao lưu và kiểm tra có mốc rõ ràng.

## Tạo bản sao mới, không ghi đè

```powershell
$demoDb = (Resolve-Path 'backend/data/saigon_stories.db').Path
if (-not (Test-Path -LiteralPath $demoDb -PathType Leaf)) { throw 'Không tìm thấy database đã chọn' }
$demoDb = (Resolve-Path -LiteralPath $demoDb).Path
New-Item -ItemType Directory -Path backups -Force | Out-Null
$backupDb = Join-Path (Resolve-Path backups).Path ('before-demo-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/backup_db.py --database $demoDb --destination $backupDb
if ($LASTEXITCODE -ne 0) { throw 'Sao lưu thất bại; không dùng tệp đích' }
```

Nguồn mở `mode=ro`; đích bắt buộc là tệp mới, thư mục cha phải có sẵn. Script từ chối đích đã tồn tại, kể cả nguồn/backup hoặc symlink. Script kiểm tra `integrity_check` và `foreign_key_check`; khi lỗi, tệp đích dở dang có thể còn lại, không dùng làm backup. Thử lại với tên mới. Script không init, seed hay migrate.

## Phục hồi thử vào tệp mới

Giữ nguyên nguồn và backup. Phục hồi bằng cách tạo snapshot từ backup vào database mới trong thư mục tạm:

```powershell
$restoreDb = Join-Path $env:TEMP ('saigon-restore-' + [guid]::NewGuid().ToString('N') + '.db')
.\.venv\Scripts\python.exe backend/scripts/backup_db.py --database $backupDb --destination $restoreDb
if ($LASTEXITCODE -ne 0) { throw 'Phục hồi thử thất bại' }
.\.venv\Scripts\python.exe -c "import sys; sys.path.insert(0,'backend'); from app.db.connection import validate_category_schema,validate_analytics_schema; from pathlib import Path; p=Path(sys.argv[1]); validate_category_schema(p); validate_analytics_schema(p); print('Schema ready')" $restoreDb
if ($LASTEXITCODE -ne 0) { throw 'Schema không phù hợp; chưa chạy API' }
$env:SAIGON_DATABASE = $restoreDb
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Chỉ bản phục hồi tạm được dùng để thử đăng nhập, số danh mục/POI/bài, nội dung, trạng thái draft/hidden/published và thống kê; không công bố placeholder. Startup có thể dọn thống kê quá hạn trên **bản phục hồi**, nên kiểm tra số liệu snapshot trước khi chạy API. Dừng API thử khi xong. Chuyển sang database đã chọn phải cập nhật `SAIGON_DATABASE` trong chính cửa sổ chạy và kiểm tra lại đường dẫn.

Việc thay database đang vận hành là bước riêng của người vận hành: dừng tất cả writer, sao lưu bản hiện tại, chọn bản phục hồi đã kiểm tra, rồi khởi động với đường dẫn mới. Không tự ghi đè, xóa, đổi tên database hoặc tệp `-wal`/`-shm` đang dùng. Không đưa database/backup hoặc thông tin tài khoản vào Git.

## Schema cũ và bằng chứng đã có

Không tự migration nguồn. Sao lưu trước, thử `migrate_db.py --check` trên bản sao, chỉ nâng cấp bản sao khi đã xác định thiếu analytics v2. Danh mục song ngữ được nâng cấp riêng bằng `prepare_category_bilingual.py` nếu thiếu cột; script từ chối khi đã áp dụng. Hai script có `--backup` bắt buộc khi ghi; xem tài liệu script và [RUNNING](../../RUNNING.md). Kiểm tra lại ứng dụng trên bản sao trước khi người vận hành quyết định nâng cấp nguồn.

Ngày 06/11: ba regression test kiểm tra WAL/transaction chưa commit, dữ liệu/version sau phục hồi, từ chối nguồn thiếu/đích có sẵn/đích trùng nguồn và phát hiện vi phạm khóa ngoại. [verify_handoff.py](../testing/tools/verify_handoff.py) đã init/seed mới, backup, phục hồi vào tên mới và đối chiếu toàn bộ bảy bảng cùng `user_version`, rồi đăng nhập qua HTTP thật. Đây là rehearsal trên database tạm, không chứng minh backup vận hành dài ngày hoặc backup ảnh.

## Ảnh tải lên

Từ 09/11 (phần mở rộng A), ảnh Admin tải lên nằm ngoài database, ở `storage/uploads/pois/` (hoặc thư mục đặt bằng `SAIGON_UPLOADS`); database chỉ giữ đường dẫn `/api/media/pois/<tệp>`. `backup_db.py` và `start-system.ps1` **chỉ sao lưu database**, nên phục hồi một mình tệp `.db` sẽ làm các địa điểm có ảnh tải lên trỏ tới tệp không còn. Khi sao lưu, chép thư mục ảnh cùng lúc và đặt cùng mốc thời gian:

```powershell
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
Copy-Item -LiteralPath 'storage/uploads' -Destination "backups/uploads-$stamp" -Recurse
```

Khi phục hồi, dừng API rồi chép thư mục ảnh cùng mốc trở lại `storage/uploads/`. Ảnh URL HTTP(S) bên ngoài (như 5 ảnh Wikimedia demo) không cần sao lưu. Quy trình này chưa được diễn tập.
