// UC03: chọn ngôn ngữ có nội dung, đọc văn bản, nghe bằng TTS (Nghe / Tạm dừng / Tiếp tục / Dừng).
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Chip } from '../../components/StateViews';
import { useSettings } from '../../context/SettingsContext';
import { colors, radius, space } from '../../theme';
import { getNarration, availableLocales, SUPPORTED_LOCALES, localeLabel } from './narrationUtils';
import { player } from './player';
import { usePlayerState } from './usePlayer';

export default function NarrationPanel({ poi }) {
  const { locale: preferred, setLocale } = useSettings();
  const have = availableLocales(poi);
  const [locale, setLoc] = useState(have.includes(preferred) ? preferred : have[0] ?? preferred);
  const [notice, setNotice] = useState(null);
  const ps = usePlayerState();
  const mine = ps.poiId === poi.id;
  const status = mine ? ps.status : 'idle';

  // Rời màn hình thì dừng đọc bài của địa điểm này.
  useEffect(() => () => { if (player.state.poiId === poi.id) player.stop(); }, [poi.id]);

  const narration = getNarration(poi, locale);

  const pick = (code) => {
    if (!have.includes(code)) {
      // UC03-A1: chưa có nội dung -> báo thiếu, không gắn nhãn sai ngôn ngữ.
      setNotice(`Chưa có thuyết minh ${localeLabel(code)} cho địa điểm này.`);
      return;
    }
    setNotice(null);
    if (code !== locale) player.stop();
    setLoc(code);
    setLocale(code);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Thuyết minh</Text>
      <View style={styles.row}>
        {SUPPORTED_LOCALES.map((l) => (
          <Chip key={l.code} label={l.label} selected={locale === l.code && have.includes(l.code)} disabled={!have.includes(l.code)} onPress={() => pick(l.code)} />
        ))}
      </View>
      {notice ? <Banner>{notice}</Banner> : null}

      {narration ? (
        <>
          <Text style={styles.title}>{narration.title}</Text>
          <Text style={styles.body} selectable>{narration.body}</Text>

          {mine && status === 'error' ? <Banner kind="error">{ps.message}</Banner> : null}
          {mine && (status === 'playing' || status === 'paused') && !player.supportsPause ? (
            <Text style={styles.hint}>Thiết bị này không hỗ trợ tạm dừng; bạn có thể Dừng hoặc Nghe lại.</Text>
          ) : null}

          <View style={styles.controls}>
            {status === 'idle' || status === 'error' ? (
              <Button title={status === 'error' ? 'Nghe lại' : 'Nghe'} onPress={() => player.play({ text: `${narration.title}. ${narration.body}`, locale, poiId: poi.id })} />
            ) : null}
            {status === 'loading' ? <Button title="Đang chuẩn bị…" disabled onPress={() => {}} /> : null}
            {status === 'playing' && player.supportsPause ? <Button title="Tạm dừng" kind="ghost" onPress={() => player.pause()} /> : null}
            {status === 'paused' ? <Button title="Tiếp tục" onPress={() => player.resume()} /> : null}
            {status === 'playing' || status === 'paused' || status === 'loading' ? <Button title="Dừng" kind="danger" onPress={() => player.stop()} /> : null}
          </View>
        </>
      ) : (
        <Banner>Địa điểm này chưa có bài thuyết minh khả dụng.</Banner>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, gap: space.sm, margin: space.md },
  h: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: space.sm },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  hint: { color: colors.muted, fontSize: 13 },
  controls: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm },
});
