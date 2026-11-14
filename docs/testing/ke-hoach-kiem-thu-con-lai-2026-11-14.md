# Kế hoạch kiểm thử phần còn lại — 14/11 → 15/11/2026

Bổ sung cho [test-plan.md](test-plan.md) và [bảng phân công hoàn thiện](../project/phan-cong-hoan-thien-2026-11-13.md). Liệt kê **mọi ca chưa có kết quả** tại `main` `608bac1`, ai chạy, chạy ở đâu, và thế nào là xong.

## 1. Đã sẵn sàng (14/11)

| Hạng mục | Trạng thái |
| --- | --- |
| DB chính `backend/data/saigon_stories.db` | Đã migrate lên **schema 5** ngày 14/11 (bản trước: `backups/before-migration-005-20261114T071912Z.db`); integrity và khóa ngoại đạt; API khởi động được |
| Bộ tự động trên `main` `608bac1` | Backend **132/132**, guest Node **40/40** + Vitest **20/20**, mobile **134** (+4 HTTP bỏ qua), build Admin và guest đạt; CI cùng commit xanh **5/5** job, gồm e2e Playwright/Edge |
| PR #7 (Gần tôi trên mobile + Playwright) | Chạy tại máy: mobile **150** (+4 bỏ qua), guest 40 + 20; CI xanh 5/5. **Chờ duyệt và merge** |
| Dữ liệu demo | 2 danh mục, 5 địa điểm công khai, mỗi điểm có ảnh, bài VI và EN (377–493 ký tự), không có nội dung mẫu |
| Công cụ kiểm tra máy | `scripts/check-test-readiness.ps1` (chỉ đọc): kiểm schema, dữ liệu demo, tệp ảnh tải lên, API qua LAN, cấu hình `.env` mobile |

## 2. Việc phải xong trước khi thử thật

| # | Việc | Người | Vì sao |
| --- | --- | --- | --- |
| P1 | Duyệt và merge PR #7 bằng **Squash and merge**; xóa các dòng `Co-authored-by` trong ô nội dung commit trước khi xác nhận | Domyan-nn | FT-24..26 cần mã mobile của PR #7 |
| P2 | Trên **mỗi máy** dùng để demo hoặc thử: `git pull`, migrate DB lên schema 5, chạy `check-test-readiness.ps1` ra `READY` | Cả ba | API mới từ chối DB schema 4 |
| P3 | Xóa biến môi trường người dùng `SAIGON_DATABASE` nếu còn trỏ tới `local-dev.db` (tệp đã xóa ngày 07/11). Kiểm tra: `[Environment]::GetEnvironmentVariable('SAIGON_DATABASE','User')` | Ai có biến này | Chạy uvicorn tay sẽ lỗi "không tìm thấy database"; `start-system.ps1` không bị ảnh hưởng vì tự đặt đường dẫn |
| P4 | Mở cổng 8000 trong Windows Firewall cho mạng Private trên máy chạy backend | Người chạy backend khi thử điện thoại | Điện thoại cần gọi `http://<IP-LAN>:8000` |

## 3. Các ca còn lại

| Nhóm | Ca | Người | Khi nào | Môi trường | Xong khi |
| --- | --- | --- | --- | --- | --- |
| **Thực địa điện thoại** | FT-1..6, 8..27 ([phiếu](../mobile/testing/mobile-field-test.md)), tương ứng TC-01-06, TC-02-03/05, TC-03-xx, TC-04-xx, TC-07-09, TC-12-08, TC-NEAR-07 | LeeNaimThwuan | 14/11 chiều | Điện thoại Android hoặc iOS + Expo Go SDK 58, cùng Wi-Fi với máy backend; API thật, DB schema 5 | Mỗi ca có kết quả thực tế và minh chứng theo [quy ước](evidence/README.md); ưu tiên theo thứ tự ghi trong phiếu |
| **UC12 trên điện thoại** | FT-17..21 kèm đối chiếu Dashboard | LeeNaimThwuan, Domyan-nn mở Dashboard Admin | 14/11 chiều, cùng lượt trên | Như trên; Admin web trên máy backend | Đồng ý thì Dashboard "đang hoạt động" tăng trong 30 giây; rút thì giảm; rút khi mất mạng được gửi lại |
| **Cài mới trên máy khác** (NFR06) | TC-NFR06 | qannee | 14/11 | Máy của qannee, clone mới vào thư mục trống, làm đúng từng bước [RUNNING.md](../../RUNNING.md) | Ghi lại từng bước đạt hoặc lỗi (kèm thông báo lỗi), thời gian cài, phiên bản Python và Node; ảnh màn hình `check-test-readiness.ps1` ra `READY` |
| **Trình duyệt Chrome** (NFR10) | TC-NFR04 trên Chrome: Guest ở 375 px và 1.440 px, Admin đăng nhập, công bố, tab Nhật ký | Domyan-nn | 14/11 | Chrome trên máy backend | Ảnh màn hình từng bước; ghi phiên bản Chrome |
| **Gần tôi trên web qua LAN** | TC-NEAR-04 nhánh "trang không an toàn" | Domyan-nn | 14/11 | Mở web khách từ điện thoại bằng `http://<IP-LAN>:5173` | Thấy thông báo yêu cầu trang an toàn, danh sách giữ thứ tự (hành vi đúng, không phải lỗi) |
| **Hồi quy sau merge PR #7** | Toàn bộ bộ tự động | Domyan-nn | Ngay sau P1 | Máy backend + CI | CI xanh 5/5 trên commit merge; ghi số liệu vào [test-results.md](test-results.md) |
| **Tổng duyệt demo** | Kịch bản [demo-guide.md](../deployment/demo-guide.md) | Cả nhóm | 15/11 tối | Máy demo thật, DB thật, điện thoại thật | Chạy hết kịch bản không cần sửa gì; ghi sự cố và cách xử lý |

## 4. Giới hạn không kiểm thử (nêu trong báo cáo)

- HTTPS và triển khai công khai (NFR01): demo chạy trong mạng LAN.
- Tiếp cận đầy đủ (NFR09) và đối chiếu pháp lý quyền riêng tư (NFR11).
- iOS nếu nhóm không có iPhone; ghi rõ chỉ thử Android.
- Phần mở rộng G nếu nhóm chốt cắt.

## 5. Ghi kết quả

1. Ca thực địa: điền trực tiếp vào [phiếu thực địa](../mobile/testing/mobile-field-test.md), cột *Minh chứng* ghi tên tệp hoặc link.
2. Ca tự động và tổng kết: thêm một mục mới ở đầu [test-results.md](test-results.md), có commit và số liệu.
3. Cập nhật cột *Kết quả* trong [test-cases.md](test-cases.md) và trạng thái trong [traceability-matrix.md](traceability-matrix.md).
4. Đưa thay đổi qua PR như mọi tài liệu khác; người khác duyệt.

**Gặp lỗi:** ghi bước tái hiện và ảnh vào nhóm chat ngay. Lỗi nghiêm trọng theo [test-plan.md mục quản lý lỗi](test-plan.md) (lộ dữ liệu nháp, bỏ qua kiểm quyền Admin, gửi thống kê khi chưa đồng ý) được sửa trước mọi việc khác, qua nhánh `fix/...` và PR.
