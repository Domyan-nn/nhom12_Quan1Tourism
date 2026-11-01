import { Link } from 'react-router-dom';

export default function PoiCard({ poi, categoryName }) {
  const locales = (poi.narrations || []).map((n) => n.locale.toUpperCase()).join(' / ');
  return (
    <Link to={`/poi/${poi.id}`} className="card">
      <div className="card-thumb" aria-hidden="true">
        {poi.image_url ? <img src={poi.image_url} alt="" /> : poi.name.charAt(0)}
      </div>
      <div className="card-body">
        <h3>{poi.name}</h3>
        <p className="muted">{poi.address}</p>
        <p className="meta">
          {categoryName && <span className="tag">{categoryName}</span>}
          {locales && <span className="muted">Thuyết minh: {locales}</span>}
        </p>
      </div>
    </Link>
  );
}
