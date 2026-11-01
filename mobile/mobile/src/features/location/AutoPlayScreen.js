import React from 'react';
import { FlatList, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { Banner, Button, Chip } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { player } from '../narration/player';
import { SUPPORTED_LOCALES } from '../narration/narrationUtils';
import { usePlayerState } from '../narration/usePlayer';
import { colors, radius, space } from '../../theme';
import { useAutoPlay } from './AutoPlayContext';

const STATUS_TEXT = {
  off: 'Đang tắt',
  requesting: 'Đang xin quyền vị trí…',
  tracking: 'Đang theo dõi vị trí',
  background: 'Tạm dừng khi ứng dụng bị ẩn',
  denied: 'Chưa có quyền vị trí',
  error: 'Không đọc được GPS',
};

export default function AutoPlayScreen() {
  const ap = useAutoPlay();
  const { locale, setLocale } = useSettings();
  const ps = usePlayerState();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h}>Tự động phát khi đến gần</Text>
            <Text style={styles.sub}>{STATUS_TEXT[ap.tracking]}</Text>
          </View>
          <Switch value={ap.enabled} onValueChange={ap.setEnabled} trackColor={{ true: colors.primary }} accessibilityLabel="Bật tự động phát" />
        </View>
        <Text style={styles.small}>
          Chỉ hoạt động khi ứng dụng đang mở trên màn hình. Vị trí của bạn không được lưu hay gửi đi.
        </Text>
        <View style={styles.row}>
          {SUPPORTED_LOCALES.map((l) => (
            <Chip key={l.code} label={l.label} selected={locale === l.code} onPress={() => setLocale(l.code)} />
          ))}
        </View>
      </View>

      {ap.message ? (
        <Banner kind="error">{ap.message}</Banner>
      ) : null}
      {ap.tracking === 'denied' ? <Button title="Mở cài đặt" kind="ghost" style={{ marginHorizontal: space.md }} onPress={() => Linking.openSettings()} /> : null}

      {ap.tracking === 'tracking' && ap.nearest ? (
        <Text style={styles.near}>{`Gần nhất: ${ap.nearest.name} (~${ap.nearest.meters} m)`}</Text>
      ) : null}

      {ps.status === 'playing' || ps.status === 'paused' || ps.status === 'loading' ? (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
          <Text style={{ flex: 1, color: colors.text }}>Đang phát thuyết minh…</Text>
          <Button title="Dừng" kind="danger" onPress={() => player.stop()} />
        </View>
      ) : null}
      {ps.status === 'error' ? <Banner kind="error">{ps.message}</Banner> : null}

      <Text style={styles.logTitle}>Nhật ký (không chứa tọa độ)</Text>
      <FlatList
        data={ap.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Text style={styles.logItem}>
            <Text style={{ color: colors.muted }}>{item.time}  </Text>
            {item.text}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có sự kiện nào.</Text>}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: space.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, margin: space.md, padding: space.md, borderRadius: radius.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  h: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, fontSize: 14 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  near: { marginHorizontal: space.md, color: colors.primary, fontWeight: '600' },
  logTitle: { marginHorizontal: space.md, marginTop: space.md, fontWeight: '700', color: colors.text },
  logItem: { paddingVertical: 6, color: colors.text, fontSize: 14 },
  empty: { color: colors.muted, paddingVertical: space.md },
});
