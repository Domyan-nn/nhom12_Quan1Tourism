import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { useSettings } from '../context/SettingsContext';

export function Loading({ label }) {
  const { t } = useSettings();
  return (
    <View style={styles.center} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label || t.loading}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry, children }) {
  const { t } = useSettings();
  return (
    <View style={styles.center}>
      <Text style={styles.errTitle}>{t.error}</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry && <Button title={t.retry} onPress={onRetry} />}
      {children}
    </View>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errTitle}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

export function Banner({ kind = 'warn', children }) {
  const bg = kind === 'error' ? colors.dangerBg : kind === 'ok' ? colors.okBg : colors.warnBg;
  const fg = kind === 'error' ? colors.danger : kind === 'ok' ? colors.ok : colors.text;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, style }) {
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : 'transparent';
  const fg = kind === 'ghost' ? colors.primary : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.primary },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[styles.chip, selected && styles.chipOn, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  muted: { color: colors.muted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  errTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  banner: { padding: space.md, borderRadius: radius.md, marginHorizontal: space.md, marginVertical: space.sm },
  btn: { paddingVertical: 12, paddingHorizontal: space.lg, borderRadius: radius.md, alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
