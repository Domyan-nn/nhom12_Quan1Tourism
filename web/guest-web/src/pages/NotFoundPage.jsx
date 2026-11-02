import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="state">
      <strong>{t.notFound}</strong>
      <p><Link to="/">{t.returnExplore}</Link></p>
    </div>
  );
}
