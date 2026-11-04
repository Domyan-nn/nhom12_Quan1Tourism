import { useAnalyticsConsent } from './useAnalyticsConsent';
import './privacy.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

// Hiển thị khi khách chưa chọn (UC12 bước 1–3). Từ chối vẫn dùng đầy đủ nội dung công khai.
export default function ConsentBanner() {
  const { t } = useLanguage();
  const { consent, error, grant, decline } = useAnalyticsConsent();
  if (error) return <div className="ss-consent" role="alert">{t[error]}</div>;
  if (consent !== 'unset') return null;
  return (
    <div className="ss-consent" role="dialog" aria-labelledby="ss-consent-title">
      <h2 id="ss-consent-title">{t.analyticsTitle}</h2>
      <p>{t.privacyCurrent}</p>
      <p>{t.privacyRetention} {t.privacyChoice}</p>
      <div className="ss-consent__actions">
        <button type="button" onClick={decline}>{t.declineConsent}</button>
        <button type="button" className="ss-primary" onClick={grant}>{t.grantConsent}</button>
      </div>
    </div>
  );
}
