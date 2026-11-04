import { useAnalyticsConsent } from './useAnalyticsConsent';
import './privacy.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

// Màn hình cài đặt quyền riêng tư (UC12 bước 5–6).
export default function PrivacySettings() {
  const { t } = useLanguage();
  const { consent, pendingRevoke, error, grant, withdraw } = useAnalyticsConsent();
  const label = { granted: t.consentGranted, denied: t.consentDenied, unset: t.consentUnset }[consent];
  return (
    <section className="ss-privacy" aria-labelledby="ss-privacy-title">
      <h2 id="ss-privacy-title">{t.analyticsTitle}</h2>
      <p>{t.analyticsTitle}: <strong>{label}</strong></p>
      {pendingRevoke && (
        <p role="status" className="ss-warn">
          {t.pendingRevoke}
        </p>
      )}
      {consent === 'granted'
        ? <button type="button" onClick={withdraw}>{t.withdrawConsent}</button>
        : <button type="button" className="ss-primary" disabled={pendingRevoke || !!error} onClick={grant}>{t.grantConsent}</button>}
    </section>
  );
}
