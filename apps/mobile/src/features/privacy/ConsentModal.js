// UC12 bước 1–3: lần mở đầu tiên khi chưa có lựa chọn.
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/StateViews';
import { colors, radius, space } from '../../theme';
import { PRIVACY_NOTICE } from './privacyText';
import { usePrivacy } from './PrivacyContext';

export default function ConsentModal() {
  const { ready, consent, grant, decline } = usePrivacy();
  const visible = false; // Backend does not provide analytics yet.
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.h}>Thống kê ẩn danh</Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {PRIVACY_NOTICE.map((t) => (
              <Text key={t} style={styles.p}>{t}</Text>
            ))}
          </ScrollView>
          <Button title="Đồng ý" onPress={grant} />
          <Button title="Từ chối" kind="ghost" onPress={decline} />
          <Text style={styles.foot}>Bạn có thể đổi lựa chọn trong tab Riêng tư.</Text>
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
