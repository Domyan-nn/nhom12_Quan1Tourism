import { useLanguage } from '../i18n/LanguageContext.jsx';

export function Loading({ label }) {
  const { t } = useLanguage();
  return <p className="state" role="status">{label || t.loading}</p>;
}

export function Empty({ title, hint }) {
  return (
    <div className="state" role="status">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, error, onRetry }) {
  const { t } = useLanguage();
  const fallback = error?.code === 'NETWORK_ERROR' ? t.networkError :
    error?.code === 'INVALID_RESPONSE' ? t.invalidResponse : t.loadError;
  return (
    <div className="state state-error" role="alert">
      <strong>{message || fallback}</strong>
      <p>{t.retryHint}</p>
      {onRetry && <button className="btn" onClick={onRetry}>{t.retry}</button>}
    </div>
  );
}
