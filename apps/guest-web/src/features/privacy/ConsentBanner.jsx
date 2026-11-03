import { useAnalyticsConsent } from './useAnalyticsConsent';
import './privacy.css';

// Hiển thị khi khách chưa chọn (UC12 bước 1–3). Từ chối vẫn dùng đầy đủ nội dung công khai.
export default function ConsentBanner() {
  const { consent, grant, decline } = useAnalyticsConsent();
  if (consent !== 'unset') return null;
  return (
    <div className="ss-consent" role="dialog" aria-labelledby="ss-consent-title">
      <h2 id="ss-consent-title">Thống kê ẩn danh</h2>
      <p>
        Chúng tôi đếm lượt truy cập để cải thiện ứng dụng. Dữ liệu thu thập chỉ gồm một mã ngẫu nhiên
        và thời điểm truy cập; không thu tên, số điện thoại hay vị trí GPS. Dữ liệu lượt được lưu tối
        đa 30 ngày. Bạn có thể rút đồng ý bất cứ lúc nào trong phần Quyền riêng tư.
      </p>
      <div className="ss-consent__actions">
        <button type="button" onClick={decline}>Từ chối</button>
        <button type="button" className="ss-primary" onClick={grant}>Đồng ý</button>
      </div>
    </div>
  );
}
