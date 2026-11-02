// UC04: theo dõi GPS (ILocation) ở foreground và tự phát thuyết minh.
// BR07: chỉ chạy khi khách bật + cấp quyền + ứng dụng đang hiển thị; KHÔNG lưu hay gửi tọa độ.
// Tọa độ chỉ đi qua bộ nhớ tạm của engine; nhật ký sự kiện không chứa tọa độ.
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { getNarration } from '../narration/narrationUtils';
import { player } from '../narration/player';
import { AutoPlayEngine } from './autoPlayEngine';
import { createLocationWatcher } from './locationWatcher';

const AutoPlayContext = createContext(null);
export const useAutoPlay = () => useContext(AutoPlayContext);

const MAX_EVENTS = 25;
const fmtTime = (d = new Date()) => d.toLocaleTimeString('vi-VN', { hour12: false });

export function AutoPlayProvider({ children }) {
  const { pois, getDetail } = useData();
  const { locale } = useSettings();
  const [enabled, setEnabledState] = useState(false);
  const [tracking, setTracking] = useState('off'); // off | requesting | tracking | background | denied | error
  const [message, setMessage] = useState(null);
  const [events, setEvents] = useState([]);
  const [nearest, setNearest] = useState(null);

  const engine = useRef(new AutoPlayEngine()).current;
  const poisRef = useRef(pois);
  const localeRef = useRef(locale);
  const startingRef = useRef(false);
  const watcherRef = useRef(null);
  poisRef.current = pois;
  localeRef.current = locale;

  const log = useCallback((code, name, errorCode) => setEvents((e) => [{ id: `${Date.now()}-${Math.random()}`, time: fmtTime(), code, name, errorCode }, ...e].slice(0, MAX_EVENTS)), []);

  const onLocation = useCallback(
    async (loc) => {
      const owner = watcherRef.current;
      const generation = owner?.currentGeneration();
      const sample = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      };
      const res = engine.evaluate({
        sample,
        pois: poisRef.current,
        locale: localeRef.current,
        now: Date.now(),
        isPlaying: player.isActive || startingRef.current,
      });

      // Chỉ để hiển thị "địa điểm gần nhất" trên màn hình; không lưu.
      const ids = Object.keys(res.distances);
      if (ids.length) {
        const nid = ids.sort((a, b) => res.distances[a] - res.distances[b])[0];
        const p = poisRef.current.find((x) => x.id === nid);
        setNearest(p ? { name: p.name, meters: Math.round(res.distances[nid]) } : null);
      }

      const poi = res.candidate;
      if (!poi || startingRef.current) return;
      startingRef.current = true;
      try {
        const detail = await getDetail(poi.id);
        if (watcherRef.current !== owner || !owner?.isCurrent(generation)) return;
        const n = getNarration(detail, localeRef.current);
        if (!n) { log('missingNarration', poi.name); return; }
        const ok = await player.play({ text: `${n.title}. ${n.body}`, locale: localeRef.current, poiId: poi.id });
        if (ok) {
          engine.recordPlaySuccess(poi.id, Date.now()); // chỉ ghi nhận khi TTS đã thực sự bắt đầu
          log('logPlayed', poi.name);
        } else {
          log('logFailed', poi.name, player.state.errorCode);
        }
      } catch (err) {
        if (err?.status === 404) log('logGone', poi.name);
        else log('logLoad', poi.name);
      } finally {
        startingRef.current = false;
      }
    },
    [engine, getDetail, log]
  );

  useEffect(() => {
    if (!enabled) {
      setTracking((previous) => previous === 'denied' ? 'denied' : 'off');
      setNearest(null);
      engine.reset();
      return undefined;
    }
    const watcher = createLocationWatcher({ location: Location, onLocation, onStatus: (status) => {
      setTracking(status);
      if (status === 'denied') { setMessage('locationDenied'); setEnabledState(false); }
      else if (status === 'error') setMessage('locationError');
      else if (status === 'tracking') setMessage(null);
    } });
    watcherRef.current = watcher;
    if (AppState.currentState === 'active') watcher.setActive(true);
    else setTracking('background');

    const appSub = AppState.addEventListener('change', (state) => {
      watcher.setActive(state === 'active');
    });
    return () => {
      watcher.dispose();
      if (watcherRef.current === watcher) watcherRef.current = null;
      appSub.remove();
    };
  }, [enabled, engine, onLocation]);

  const setEnabled = useCallback((v) => {
    if (!v) { watcherRef.current?.dispose(); watcherRef.current = null; setTracking('off'); }
    setMessage(null);
    setEnabledState(v);
  }, []);

  const value = useMemo(
    () => ({ enabled, setEnabled, tracking, message, events, nearest }),
    [enabled, setEnabled, tracking, message, events, nearest]
  );
  return <AutoPlayContext.Provider value={value}>{children}</AutoPlayContext.Provider>;
}
