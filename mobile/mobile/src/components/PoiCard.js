import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mediaUrl } from '../services';
import { colors, radius, shadow, space } from '../theme';

export default function PoiCard({ poi, categoryName, onPress }) {
  const uri = mediaUrl(poi.image_url);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${poi.name}. ${poi.address}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.ph]}>
          <Text style={styles.phText}>{poi.name.slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.body}>
        {categoryName ? <Text style={styles.cat}>{categoryName}</Text> : null}
        <Text style={styles.name}>{poi.name}</Text>
        <Text style={styles.addr} numberOfLines={2}>{poi.address}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, marginHorizontal: space.md, marginBottom: space.md, overflow: 'hidden', ...shadow },
  img: { width: 92, height: 92 },
  ph: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  phText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  body: { flex: 1, padding: space.md, gap: 2 },
  cat: { color: colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  addr: { color: colors.muted, fontSize: 13 },
});
