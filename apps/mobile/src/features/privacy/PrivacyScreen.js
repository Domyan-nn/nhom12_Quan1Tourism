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
  const { consent, hasPendingRevoke, grant, decline, revoke } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const result = await fn();
      setInfo(result === false ? t.withdrawPending : message);
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
      {hasPendingRevoke ? <Banner>{t.pendingRevoke}</Banner> : null}
      {info ? <Banner kind="ok">{info}</Banner> : null}

      {consent === 'granted' ? (
        <Button title={t.withdraw} kind="danger" disabled={busy} onPress={() => run(revoke, t.withdrawDone)} />
      ) : (
        <Button title={t.grantButton} disabled={busy} onPress={() => run(async () => { await grant(); return true; }, t.grantDone)} />
      )}
      {consent === null ? (
        <Button title={t.declineButton} kind="ghost" disabled={busy} onPress={() => run(async () => { await decline(); return true; }, t.declineDone)} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: space.md, borderRadius: radius.md, gap: space.sm },
  status: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
