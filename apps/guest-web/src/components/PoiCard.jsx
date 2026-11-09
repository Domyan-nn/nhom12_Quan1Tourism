import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function PoiCard({ poi, categoryName }) {
  const { t } = useLanguage();
  const locales = (poi.narration_locales || []).map((locale) => locale.toUpperCase()).join(' / ');
  return (
    <Link to={`/poi/${poi.id}`} className="card">
      <div className="card-thumb" aria-hidden="true">
        {poi.image_url ? <img src={poi.image_url} alt="" title={poi.image_credit || undefined} /> : poi.name.charAt(0)}
      </div>
      <div className="card-body">
        <h3>{poi.name}</h3>
        <p className="muted">{poi.address}</p>
        <p className="meta">
          {categoryName && <span className="tag">{categoryName}</span>}
          {locales && <span className="muted">{t.narration}: {locales}</span>}
        </p>
      </div>
    </Link>
  );
}
