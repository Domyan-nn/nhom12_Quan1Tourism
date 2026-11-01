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
    let visible = AppState.currentState === 'active';
    let online = true;
    const sync = () => client.setRunning(visible && online); // BR15: chỉ gửi khi hiển thị và có mạng
    const unsub = client.subscribe(setSnap);
    client.init().then(() => {
      setReady(true);
      sync();
    });
    const appSub = AppState.addEventListener('change', (s) => {
      visible = s === 'active';
      sync();
    });
    const netSub = NetInfo.addEventListener((s) => {
      online = s.isConnected !== false && s.isInternetReachable !== false;
      sync();
    });
    return () => {
      unsub();
      appSub.remove();
      netSub();
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
      revoke: () => client.revoke(),
    }),
    [ready, snap, client]
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}
