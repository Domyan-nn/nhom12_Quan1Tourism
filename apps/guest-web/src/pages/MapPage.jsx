import { Empty } from '../components/StateViews.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// UC02 – WBS-10. Component MapView do Lê Nam Thuận tích hợp vào #map-slot.
export default function MapPage() {
  const { t } = useLanguage();
  return (
    <section>
      <h1>{t.map}</h1>
      <div id="map-slot" className="map-slot">
        <Empty title={t.mapPending} hint={t.mapHint} />
      </div>
    </section>
  );
}
