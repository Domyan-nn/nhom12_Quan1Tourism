## Thay đổi

<!-- Một đến ba câu: làm gì và vì sao. -->

Closes #<!-- số issue -->

## Yêu cầu liên quan

<!-- Mã trong PRD và tài liệu: F.., UC.., BR.., NFR.., phần mở rộng A/B/C/G. -->

## Cách kiểm thử

<!-- Lệnh đã chạy và kết quả (dán dòng tổng kết), hoặc các bước thử tay kèm ảnh. -->

- [ ] Backend: `python -m unittest discover -s backend/tests`
- [ ] Guest web: `npm --prefix apps/guest-web test` và `run build`
- [ ] Admin web: `npm --prefix apps/admin-web run build`
- [ ] Mobile: `npm --prefix apps/mobile test -- --runInBand`
- [ ] Playwright (nếu đổi web hoặc API): `npm --prefix apps/guest-web run test:browser`

## Kiểm tra trước khi nhờ review

- [ ] Nhánh tách từ `main` mới nhất, đặt tên theo [CONTRIBUTING](../CONTRIBUTING.md#1-nhánh)
- [ ] Không commit DB, `backups/`, `storage/`, `.env`, `dist/`, `node_modules/`
- [ ] Có migration mới thì đánh số tiếp theo, có script kèm `--check` và `--backup`, đã cập nhật `migrations/README.md`
- [ ] Đã cập nhật tài liệu bị ảnh hưởng: `docs/API_CONTRACT.md`, `docs/testing/test-cases.md`, `docs/testing/traceability-matrix.md`, `RUNNING.md`
- [ ] Ảnh chụp màn hình cho thay đổi giao diện (nếu có)
