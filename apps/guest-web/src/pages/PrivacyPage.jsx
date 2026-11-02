import { useLanguage } from '../i18n/LanguageContext.jsx';

// Consent and retention are pending implementation.
export default function PrivacyPage() {
  const { t } = useLanguage();
  return (
    <section className="prose">
      <h1>{t.privacy}</h1>
      <p>{t.privacyIntro}</p>
      <p>{t.privacyCurrent}</p>
      <p>{t.privacyPending}</p>
    </section>
  );
}
