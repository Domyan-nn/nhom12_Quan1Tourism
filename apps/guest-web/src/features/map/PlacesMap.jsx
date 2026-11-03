import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { ErrorState, Loading } from '../../components/StateViews.jsx';
import { toCoordinate } from './mapMarkers.js';

// No GPS request, background tracking, tile prefetch or API credentials.
export default function PlacesMap({ markers, onSelect }) {
  const { t } = useLanguage();
  const container = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let map;
    let timer;
    setStatus('loading');
    const fail = () => { if (!cancelled) setStatus('error'); };
    async function mount() {
      try {
        const L = await import('leaflet');
        if (cancelled) return;
        map = L.map(container.current, { zoomControl: false, scrollWheelZoom: false });
        L.control.zoom({ zoomInTitle: t.zoomIn, zoomOutTitle: t.zoomOut }).addTo(map);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        timer = setTimeout(fail, 12000);
        tiles.on('tileload', () => {
          clearTimeout(timer);
          if (!cancelled) setStatus((s) => s === 'error' ? s : 'ready');
        });
        tiles.on('tileerror', () => { clearTimeout(timer); fail(); });
        tiles.addTo(map);
        const icon = L.divIcon({ className: 'place-marker', html: '<span aria-hidden="true">●</span>',
          iconSize: [32, 32], iconAnchor: [16, 16] });
        markers.forEach((poi) => {
          // API text goes into attributes/React text, never into Leaflet HTML.
          L.marker(toCoordinate(poi), { icon, title: poi.name, alt: poi.name, keyboard: true })
            .on('click', () => onSelect(poi))
            .on('keydown', (event) => {
              if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
                L.DomEvent.stop(event.originalEvent);
                onSelect(poi);
              }
            }).addTo(map);
        });
        map.fitBounds(L.latLngBounds(markers.map(toCoordinate)), { padding: [35, 35], maxZoom: 15 });
      } catch { clearTimeout(timer); fail(); }
    }
    mount();
    return () => { cancelled = true; clearTimeout(timer); map?.remove(); };
  }, [markers, onSelect, attempt, t]);

  return <div className="places-map-wrap">
    <div ref={container} className="places-map" role="region" aria-label={t.mapLabel} />
    {status === 'loading' && <Loading label={t.mapLoading} />}
    {status === 'error' && <ErrorState message={t.mapFailed} onRetry={() => setAttempt((v) => v + 1)} />}
  </div>;
}
