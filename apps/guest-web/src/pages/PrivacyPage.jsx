import { useLanguage } from '../i18n/LanguageContext.jsx';
import PrivacySettings from '../features/privacy/PrivacySettings.jsx';
import { USE_MOCK } from '../api/index.js';

export default function PrivacyPage() {
  const { t } = useLanguage();
  return (
    <section className="prose">
      <h1>{t.privacy}</h1>
      <p>{t.privacyIntro}</p>
      {USE_MOCK ? <p>{t.analyticsMock}</p> : <>
        <p>{t.privacyCurrent}</p>
        <p>{t.privacyRetention}</p>
        <p>{t.privacyWithdrawal}</p>
        <PrivacySettings />
      </>}
    </section>
  );
}
