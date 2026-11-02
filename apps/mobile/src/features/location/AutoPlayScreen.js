import React from 'react';
import { FlatList, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { Banner, Button, Chip } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { playerError } from '../../context/translations';
import { player } from '../narration/player';
import { SUPPORTED_LOCALES } from '../narration/narrationUtils';
import { usePlayerState } from '../narration/usePlayer';
import { colors, radius, space } from '../../theme';
import { useAutoPlay } from './AutoPlayContext';

const STATUS_TEXT = { off: 'autoOff', requesting: 'autoRequesting', tracking: 'autoTracking', background: 'autoBackground', denied: 'autoDenied', error: 'autoError' };

export default function AutoPlayScreen() {
  const ap = useAutoPlay();
  const { locale, setLocale, uiLanguage, setUiLanguage, t } = useSettings();
  const ps = usePlayerState();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.h}>{t.uiLanguage}</Text>
        <View style={styles.row}>
          <Chip label="Tiếng Việt" selected={uiLanguage === 'vi'} onPress={() => setUiLanguage('vi')} />
          <Chip label="English" selected={uiLanguage === 'en'} onPress={() => setUiLanguage('en')} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h}>{t.autoTitle}</Text>
            <Text style={styles.sub}>{t[STATUS_TEXT[ap.tracking]]}</Text>
          </View>
          <Switch value={ap.enabled} onValueChange={ap.setEnabled} trackColor={{ true: colors.primary }} accessibilityLabel={t.autoSwitch} />
        </View>
        <Text style={styles.small}>
          {t.autoPrivacy}
        </Text>
        <Text style={styles.sub}>{t.narrationLanguage}</Text><View style={styles.row}>
          {SUPPORTED_LOCALES.map((l) => (
            <Chip key={l.code} label={l.label} selected={locale === l.code} onPress={() => setLocale(l.code)} />
          ))}
        </View>
      </View>

      {ap.message ? (
        <Banner kind="error">{t[ap.message]}</Banner>
      ) : null}
      {ap.tracking === 'denied' ? <Button title={t.settings} kind="ghost" style={{ marginHorizontal: space.md }} onPress={() => Linking.openSettings()} /> : null}

      {ap.tracking === 'tracking' && ap.nearest ? (
        <Text style={styles.near}>{`${t.nearest}: ${ap.nearest.name} (~${ap.nearest.meters} m)`}</Text>
      ) : null}

      {ps.status === 'playing' || ps.status === 'paused' || ps.status === 'loading' ? (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
          <Text style={{ flex: 1, color: colors.text }}>{t.playing}</Text>
          <Button title={t.stop} kind="danger" onPress={() => player.stop()} />
        </View>
      ) : null}
      {ps.status === 'error' ? <Banner kind="error">{playerError(t, ps.errorCode)}</Banner> : null}

      <Text style={styles.logTitle}>{t.log}</Text>
      <FlatList
        data={ap.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Text style={styles.logItem}>
            <Text style={{ color: colors.muted }}>{item.time}  </Text>
            {`${t[item.code]}: ${item.name}${item.errorCode ? ` — ${playerError(t, item.errorCode)}` : ''}`}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t.noEvents}</Text>}
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
