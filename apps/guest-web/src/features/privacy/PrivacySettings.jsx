import { useAnalyticsConsent } from './useAnalyticsConsent';
import './privacy.css';

// Màn hình cài đặt quyền riêng tư (UC12 bước 5–6).
export default function PrivacySettings() {
  const { consent, pendingRevoke, grant, withdraw } = useAnalyticsConsent();
  const label = { granted: 'Đang bật', denied: 'Đang tắt', unset: 'Chưa chọn' }[consent];
  return (
    <section className="ss-privacy" aria-labelledby="ss-privacy-title">
      <h2 id="ss-privacy-title">Quyền riêng tư</h2>
      <p>Thống kê ẩn danh: <strong>{label}</strong></p>
      {pendingRevoke && (
        <p role="status" className="ss-warn">
          Yêu cầu rút đồng ý chưa gửi được (có thể do mất mạng). Ứng dụng đã ngừng gửi dữ liệu và sẽ
          tự gửi lại khi có mạng.
        </p>
      )}
      {consent === 'granted'
        ? <button type="button" onClick={withdraw}>Rút đồng ý</button>
        : <button type="button" className="ss-primary" onClick={grant}>Đồng ý thống kê</button>}
      <p className="ss-note">
        Không thu tên, số điện thoại hoặc tọa độ GPS. Dữ liệu lượt được giữ tối đa 30 ngày.
      </p>
    </section>
  );
}
