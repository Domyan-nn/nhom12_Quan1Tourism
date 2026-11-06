// UC12 bước 1–3: lần mở đầu tiên khi chưa có lựa chọn.
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { colors, radius, space } from '../../theme';
import { usePrivacy } from './PrivacyContext';

export default function ConsentModal() {
  const { t } = useSettings();
  const { ready, consent, storageError, isMock, grant, decline } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const choose = async (action) => {
    setBusy(true);
    try { await action(); }
    finally { setBusy(false); }
  };
  const visible = ready && consent === null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.h}>{t.consentTitle}</Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {['privacyP1', 'privacyP2', 'privacyP3', 'privacyP4'].map((k) => (
              <Text key={k} style={styles.p}>{t[k]}</Text>
            ))}
          </ScrollView>
          {storageError ? <Banner kind="error">{t.privacyStorageError}</Banner> : null}
          {isMock ? <Banner>{t.analyticsMock}</Banner> : null}
          <Button title={t.consentAccept} disabled={busy || storageError || isMock} onPress={() => choose(grant)} />
          <Button title={t.consentDecline} kind="ghost" disabled={busy} onPress={() => choose(decline)} />
          <Text style={styles.foot}>{t.consentFoot}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: space.lg },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  h: { fontSize: 20, fontWeight: '800', color: colors.text },
  p: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: space.sm },
  foot: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
