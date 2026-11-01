// UC12: trạng thái và thay đổi lựa chọn thống kê ẩn danh.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button } from '../../components/StateViews';
import { colors, radius, space } from '../../theme';
import { PRIVACY_NOTICE } from './privacyText';
import { usePrivacy } from './PrivacyContext';

const LABEL = { granted: 'Đã đồng ý thống kê ẩn danh', denied: 'Không thu thập thống kê', null: 'Chưa chọn (không thu thập thống kê)' };

export default function PrivacyScreen() {
  const p = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      setInfo(res === false ? 'Chưa gửi được yêu cầu rút tới máy chủ (có thể đang mất mạng). Ứng dụng đã dừng gửi dữ liệu và sẽ thử lại khi có mạng.' : okMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <View style={styles.card}>
        <Text style={styles.h}>Quyền riêng tư</Text>
        <Text style={styles.status}>{LABEL[p.consent ?? 'null']}</Text>
        {PRIVACY_NOTICE.map((t) => (
          <Text key={t} style={styles.p}>{t}</Text>
        ))}
      </View>

      {p.hasPendingRevoke ? <Banner>Yêu cầu rút đồng ý đang chờ gửi tới máy chủ; sẽ tự thử lại khi có mạng và ứng dụng đang mở.</Banner> : null}
      {info ? <Banner kind="ok">{info}</Banner> : null}

      {p.consent === 'granted' ? (
        <Button title="Rút đồng ý" kind="danger" disabled={busy} onPress={() => run(p.revoke, 'Đã rút đồng ý. Ứng dụng đã dừng gửi dữ liệu thống kê.')} />
      ) : (
        <Button title="Đồng ý thống kê ẩn danh" disabled={busy} onPress={() => run(async () => { await p.grant(); return true; }, 'Cảm ơn bạn. Bạn có thể rút đồng ý bất cứ lúc nào.')} />
      )}
      {p.consent === null ? (
        <Button title="Từ chối" kind="ghost" disabled={busy} onPress={() => run(async () => { await p.decline(); return true; }, 'Đã lưu lựa chọn từ chối.')} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: space.md, borderRadius: radius.md, gap: space.sm },
  h: { fontSize: 20, fontWeight: '800', color: colors.text },
  status: { color: colors.primary, fontWeight: '700' },
  p: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
