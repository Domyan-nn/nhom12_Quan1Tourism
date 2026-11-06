import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { ErrorState, Loading } from '../../components/StateViews.jsx';
import { toCoordinate } from './mapMarkers.js';

const tileSources = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    url: 'https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.de/germanstyle/">OpenStreetMap Deutschland</a>',
  },
];

// No GPS request, background tracking, tile prefetch or API credentials.
export default function PlacesMap({ markers, onSelect }) {
  const { t } = useLanguage();
  const container = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let map;
    let tiles;
    let timer;
    let tileLoaded = false;
    setStatus('loading');
    const useNextSource = (L, index, current) => {
      if (cancelled || tiles !== current || tileLoaded) return;
      clearTimeout(timer);
      current.remove();
      tiles = undefined;
      if (index + 1 < tileSources.length) startTiles(L, index + 1);
      else setStatus('error');
    };
    const startTiles = (L, index) => {
      tileLoaded = false;
      const source = tileSources[index];
      const current = L.tileLayer(source.url, { maxZoom: 19, attribution: source.attribution });
      tiles = current;
      timer = setTimeout(() => useNextSource(L, index, current), 12000);
      current.on('tileload', () => {
        if (cancelled || tiles !== current) return;
        tileLoaded = true;
        clearTimeout(timer);
        setStatus('ready');
      });
      current.on('tileerror', () => useNextSource(L, index, current));
      current.addTo(map);
    };
    async function mount() {
      try {
        const L = await import('leaflet');
        if (cancelled) return;
        map = L.map(container.current, { zoomControl: false, scrollWheelZoom: false });
        L.control.zoom({ zoomInTitle: t.zoomIn, zoomOutTitle: t.zoomOut }).addTo(map);
        startTiles(L, 0);
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
      } catch {
        clearTimeout(timer);
        tiles?.remove();
        if (!cancelled) setStatus('error');
      }
    }
    mount();
    return () => { cancelled = true; clearTimeout(timer); map?.remove(); };
  }, [markers, onSelect, attempt, t]);

  return <div className={`places-map-wrap${status === 'error' ? ' is-map-fallback' : ''}`}>
    <div ref={container} className="places-map" role="region" aria-label={t.mapLabel} />
    {status === 'error' && <span className="map-fallback-label" aria-hidden="true">{t.mapFallbackLabel}</span>}
    {status === 'loading' && <Loading label={t.mapLoading} />}
    {status === 'error' && <ErrorState message={t.mapFailed} onRetry={() => setAttempt((v) => v + 1)} />}
  </div>;
}
