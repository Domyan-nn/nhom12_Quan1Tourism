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
  poisRef.current = pois;
  localeRef.current = locale;

  const log = useCallback((text) => setEvents((e) => [{ id: `${Date.now()}-${Math.random()}`, time: fmtTime(), text }, ...e].slice(0, MAX_EVENTS)), []);

  const onLocation = useCallback(
    async (loc) => {
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
        const n = getNarration(detail, localeRef.current);
        if (!n) throw new Error('Không có bài thuyết minh ở ngôn ngữ đã chọn.');
        const ok = await player.play({ text: `${n.title}. ${n.body}`, locale: localeRef.current, poiId: poi.id });
        if (ok) {
          engine.recordPlaySuccess(poi.id, Date.now()); // chỉ ghi nhận khi TTS đã thực sự bắt đầu
          log(`Đã phát: ${poi.name}`);
        } else {
          log(`Không phát được "${poi.name}": ${player.state.message ?? 'lỗi TTS'}`); // UC04-E2
        }
      } catch (err) {
        if (err?.status === 404) log(`"${poi.name}" không còn công khai.`);
        else log(`Lỗi khi tải bài "${poi.name}".`);
      } finally {
        startingRef.current = false;
      }
    },
    [engine, getDetail, log]
  );

  useEffect(() => {
    if (!enabled) {
      setTracking('off');
      setNearest(null);
      engine.reset();
      return undefined;
    }
    let sub = null;
    let cancelled = false;

    const stopWatching = () => {
      sub?.remove();
      sub = null;
    };
    const startWatching = async () => {
      if (sub || cancelled) return;
      setTracking('requesting');
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          // UC04-E1: từ chối quyền -> báo lỗi và kết thúc; vẫn nghe thủ công ở UC03.
          setTracking('denied');
          setMessage('Bạn chưa cấp quyền vị trí nên không thể tự phát. Bạn vẫn có thể nghe thủ công trong chi tiết địa điểm.');
          setEnabledState(false);
          return;
        }
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
          onLocation
        );
        if (cancelled) return s.remove();
        sub = s;
        setMessage(null);
        setTracking('tracking');
      } catch {
        if (!cancelled) {
          setTracking('error');
          setMessage('Không đọc được GPS. Hãy bật dịch vụ vị trí rồi thử lại.');
        }
      }
    };

    if (AppState.currentState === 'active') startWatching();
    else setTracking('background');

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startWatching();
      else {
        stopWatching(); // BR07: ứng dụng ẩn -> dừng theo dõi
        setTracking('background');
      }
    });
    return () => {
      cancelled = true;
      appSub.remove();
      stopWatching();
    };
  }, [enabled, engine, onLocation]);

  const setEnabled = useCallback((v) => {
    setMessage(null);
    setEnabledState(v);
  }, []);

  const value = useMemo(
    () => ({ enabled, setEnabled, tracking, message, events, nearest }),
    [enabled, setEnabled, tracking, message, events, nearest]
  );
  return <AutoPlayContext.Provider value={value}>{children}</AutoPlayContext.Provider>;
}
