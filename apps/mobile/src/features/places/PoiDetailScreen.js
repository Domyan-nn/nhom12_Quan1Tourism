// UC01 bước 5–6: chi tiết địa điểm + UC03 thuyết minh.
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, ErrorState, Loading } from '../../components/StateViews';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { categoryName, errorText } from '../../context/translations';
import NarrationPanel from '../narration/NarrationPanel';
import { mediaUrl } from '../../services';
import { colors, space } from '../../theme';

export default function PoiDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const data = useData();
  const { t, uiLanguage } = useSettings();
  const [st, setSt] = useState({ status: 'loading', poi: null, error: null, gone: false });

  const load = useCallback(async () => {
    setSt((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const poi = await data.getDetail(id, { force: true });
      setSt({ status: 'ready', poi, error: null, gone: false });
    } catch (err) {
      if (err?.status === 404) {
        // UC02-E2: địa điểm vừa bị ẩn.
        data.dropPoi(id);
        setSt({ status: 'error', poi: null, error: err, gone: true });
      } else {
        // NFR02: có bản đã tải thì vẫn cho đọc.
        const cached = data.pois.find((p) => p.id === id);
        if (cached?.narrations) setSt({ status: 'ready', poi: cached, error: err, gone: false });
        else setSt({ status: 'error', poi: null, error: err, gone: false });
      }
    }
  }, [id, data]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (st.status === 'loading') return <Loading />;
  if (st.status === 'error') {
    return (
      <ErrorState message={st.gone ? t.locationGone : errorText(t, st.error)} onRetry={st.gone ? undefined : load}>
        {st.gone ? <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => navigation.goBack()}>{t.back}</Text> : null}
      </ErrorState>
    );
  }

  const { poi } = st;
  const uri = mediaUrl(poi.image_url);
  const catName = categoryName(data.categories.find((c) => c.id === poi.category_id), uiLanguage);
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space.xl }}>
      {uri ? <Image source={{ uri }} style={styles.hero} accessibilityLabel={poi.name} /> : null}
      {uri && poi.image_credit ? <Text style={styles.credit}>{`${t.photoCredit}: ${poi.image_credit}`}</Text> : null}
      <View style={styles.info}>
        {catName ? <Text style={styles.cat}>{catName}</Text> : null}
        <Text style={styles.name}>{poi.name}</Text>
        <Text style={styles.addr}>{poi.address}</Text>
      </View>
      {st.error ? <Banner kind="error">{`${errorText(t, st.error)} ${t.cached}`}</Banner> : null}
      <NarrationPanel poi={poi} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  credit: { color: colors.muted, fontSize: 12, paddingHorizontal: space.md, paddingTop: 4 },
  info: { padding: space.md, gap: 4 },
  cat: { color: colors.accent, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  addr: { color: colors.muted, fontSize: 15 },
});
