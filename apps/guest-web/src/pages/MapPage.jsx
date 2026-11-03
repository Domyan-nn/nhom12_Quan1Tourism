import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorState, Loading } from '../components/StateViews.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { getPoi, listPois } from '../api/index.js';
import PlacesMap from '../features/map/PlacesMap.jsx';
import { getMapMarkers } from '../features/map/mapMarkers.js';

// UC02 / WBS-10: uses exactly the existing public API in both explicit modes.
export default function MapPage() {
  const { t } = useLanguage();
  const pois = useAsync(() => listPois(), []);
  const [removed, setRemoved] = useState([]);
  const [selected, setSelected] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const markers = useMemo(() => getMapMarkers(pois.data).filter((p) => !removed.includes(p.id)), [pois.data, removed]);
  const select = useCallback(async (poi) => {
    const current = ++request.current;
    setUnavailable(false);
    setSelected({ poi, status: 'loading' });
    try {
      const detail = await getPoi(poi.id);
      if (current === request.current) setSelected({ poi: detail, status: 'ready' });
    } catch (error) {
      if (current !== request.current) return;
      if (error.status === 404) {
        setRemoved((ids) => [...ids, poi.id]);
        setSelected(null);
        setUnavailable(true);
      } else setSelected({ poi, status: 'error', error });
    }
  }, []);

  return (
    <section>
      <h1>{t.map}</h1>
      <p className="muted lead">{t.mapHint}</p>
      <Link className="back" to="/">{t.returnList}</Link>
      {unavailable && <p role="alert">{t.unavailable}</p>}
      {pois.status === 'loading' && <Loading />}
      {pois.status === 'error' && <ErrorState error={pois.error} onRetry={pois.retry} />}
      {pois.status === 'success' && markers.length === 0 && <Empty title={t.noMapMarkers} hint={t.mapEmptyHint} />}
      {pois.status === 'success' && markers.length > 0 && <>
        <PlacesMap markers={markers} onSelect={select} />
        <div className="chips" role="group" aria-label={t.mapPlaces}>
          {markers.map((p) => <button className="chip" key={p.id} aria-pressed={selected?.poi.id === p.id}
            onClick={() => select(p)}>{p.name}</button>)}
        </div>
      </>}
      {selected && <article className="map-summary" aria-label={t.placeSummary}>
        <h2>{selected.poi.name}</h2><p>{selected.poi.address}</p>
        {selected.status === 'loading' && <Loading label={t.checking} />}
        {selected.status === 'error' && <ErrorState error={selected.error} onRetry={() => select(selected.poi)} />}
        {selected.status === 'ready' && <Link className="btn" to={`/poi/${encodeURIComponent(selected.poi.id)}`}>{t.viewDetail}</Link>}
      </article>}
    </section>
  );
}
