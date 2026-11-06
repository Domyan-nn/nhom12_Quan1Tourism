// UC12: trạng thái và thay đổi lựa chọn thống kê ẩn danh.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { USE_MOCK } from '../../services';
import { colors, radius, space } from '../../theme';
import { usePrivacy } from './PrivacyContext';

export default function PrivacyScreen() {
  const { t } = useSettings();
  const { consent, hasPendingRevoke, storageError, grant, decline, revoke } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const run = async (fn, message, failure = t.withdrawPending) => {
    setBusy(true);
    try {
      const result = await fn();
      setInfo({ message: result === false ? failure : message, kind: result === false ? 'error' : 'ok' });
    } finally {
      setBusy(false);
    }
  };

  const status = consent === 'granted' ? t.privacyGranted : consent === 'denied' ? t.privacyDenied : t.privacyUnset;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={styles.card}>
        <Text style={styles.status}>{status}</Text>
        {['privacyP1', 'privacyP2', 'privacyP3', 'privacyP4'].map((k) => (
          <Text key={k} style={styles.p}>{t[k]}</Text>
        ))}
      </View>
      {USE_MOCK ? <Banner>{t.analyticsMock}</Banner> : null}
      {storageError ? <Banner kind="error">{t.privacyStorageError}</Banner> : null}
      {hasPendingRevoke ? <Banner>{t.pendingRevoke}</Banner> : null}
      {info ? <Banner kind={info.kind}>{info.message}</Banner> : null}

      {consent === 'granted' ? (
        <Button title={t.withdraw} kind="danger" disabled={busy} onPress={() => run(revoke, t.withdrawDone)} />
      ) : (
        <Button title={t.grantButton} disabled={busy || USE_MOCK || hasPendingRevoke || storageError} onPress={() => run(grant, t.grantDone, t.privacyStorageError)} />
      )}
      {consent === null ? (
        <Button title={t.declineButton} kind="ghost" disabled={busy} onPress={() => run(decline, t.declineDone, t.privacyStorageError)} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: space.md, borderRadius: radius.md, gap: space.sm },
  status: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
