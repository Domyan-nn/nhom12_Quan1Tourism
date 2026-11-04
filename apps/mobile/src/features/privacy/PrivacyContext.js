import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { analyticsApi, storage } from '../../services';
import { AnalyticsClient } from './AnalyticsClient';

const PrivacyContext = createContext(null);
export const usePrivacy = () => useContext(PrivacyContext);

export function PrivacyProvider({ children }) {
  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = new AnalyticsClient({ storage, api: analyticsApi, randomId: () => Crypto.randomUUID() });
  }
  const client = clientRef.current;
  const [snap, setSnap] = useState({ consent: null, hasPendingRevoke: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let visible = AppState.currentState === 'active';
    let online = true;
    // BR15: chỉ gửi heartbeat khi ứng dụng đang hiển thị và có mạng.
    const sync = () => client.setRunning(mounted && visible && online);
    const unsub = client.subscribe(setSnap);
    client.init().then(() => {
      if (!mounted) return;
      setReady(true);
      sync();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      visible = state === 'active';
      sync();
    });
    const netUnsub = NetInfo.addEventListener((state) => {
      online = state.isConnected !== false && state.isInternetReachable !== false;
      sync();
    });
    return () => {
      mounted = false;
      unsub();
      appSub.remove();
      netUnsub();
      client.setRunning(false);
    };
  }, [client]);

  const value = useMemo(
    () => ({
      ready,
      consent: snap.consent, // null (chưa chọn) | 'granted' | 'denied'
      hasPendingRevoke: snap.hasPendingRevoke,
      grant: () => client.grant(),
      decline: () => client.decline(),
      revoke: () => client.revoke(), // true nếu server đã nhận; false nếu còn chờ gửi lại
    }),
    [ready, snap, client]
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}
