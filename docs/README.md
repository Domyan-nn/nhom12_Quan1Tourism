# Tài liệu dự án

Mục lục cho bộ tài liệu nộp môn Công nghệ phần mềm. Cập nhật 09/11/2026.

| Nhóm | Tài liệu | Nội dung |
| --- | --- | --- |
| Yêu cầu | [PRD](../PRD_Saigon_Stories_Quan1_SQLite.docx) | Vấn đề, phạm vi, F01–F12, BR01–BR19, NFR01–NFR08, đặc tả UC01–UC12 |
| | [requirements/](requirements/README.md) | Quy ước quản lý phiên bản PRD |
| Phân tích – thiết kế | [use-cases.md](analysis-design/use-cases.md) | Danh sách use case |
| | [architecture.md](analysis-design/architecture.md) | Kiến trúc đối chiếu mã nguồn |
| | [database-design.md](analysis-design/database-design.md), [data-dictionary.md](analysis-design/data-dictionary.md) | Thiết kế và từ điển dữ liệu SQLite |
| | [API_CONTRACT.md](API_CONTRACT.md) | Hợp đồng API đã triển khai |
| | [diagrams/](diagrams/README.md) | Use case, hoạt động, dữ liệu, thành phần, triển khai (từ PRD) và 4 sơ đồ tuần tự |
| Kiểm thử | [test-plan.md](testing/test-plan.md) | Kế hoạch: phạm vi, chiến lược, môi trường, tiêu chí đạt, quản lý lỗi |
| | [test-cases.md](testing/test-cases.md) | Ca kiểm thử UC01–UC12, phi chức năng, dữ liệu |
| | [traceability-matrix.md](testing/traceability-matrix.md) | Truy vết F/BR/NFR → UC → API → mã → ca kiểm thử |
| | [test-results.md](testing/test-results.md) | Kết quả theo từng đợt |
| | [mobile-field-test.md](mobile/testing/mobile-field-test.md) | Phiếu kiểm thử trên điện thoại (GPS, TTS, thống kê) |
| | `testing/evidence/` | Minh chứng ảnh/video (chưa có) |
| Triển khai – vận hành | [RUNNING.md](../RUNNING.md) | Cài đặt, chạy, kiểm thử |
| | [backup-restore.md](deployment/backup-restore.md) | Sao lưu và phục hồi SQLite |
| | [demo-guide.md](deployment/demo-guide.md) | Kịch bản demo |
| | [demo-images.md](deployment/demo-images.md) | Nguồn và giấy phép ảnh demo |
| | [backend/migrations/README.md](../backend/migrations/README.md) | Thứ tự migration |
| Báo cáo | `final-report/` | Báo cáo cuối kỳ (chưa có) |

Các tệp `testing/*-2026-11-0x.md` và `mobile/testing/day*.md` là nhật ký từng đợt tích hợp, giữ làm lịch sử.
