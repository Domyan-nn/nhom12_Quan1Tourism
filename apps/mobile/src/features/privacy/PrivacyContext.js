import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    const unsub = client.subscribe(setSnap);
    let mounted = true;
    client.init().then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
      unsub();
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
