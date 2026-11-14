// UC01: Khám phá — danh sách địa điểm công khai, tìm theo tên, lọc theo danh mục (BR01, BR02).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banner, Chip, EmptyState, ErrorState, Loading } from '../../components/StateViews';
import PoiCard from '../../components/PoiCard';
import { useData } from '../../context/DataContext';
import { useSettings } from '../../context/SettingsContext';
import { categoryName, errorText } from '../../context/translations';
import { USE_MOCK, publicApi } from '../../services';
import { filterPois } from '../../services/publicApi';
import { colors, radius, space } from '../../theme';
import { formatDistance, sortByDistance } from './nearMe';
import useNearMe from './useNearMe';

// Phần B "Gần tôi": sắp theo khoảng cách ngay trên máy, không gửi tọa độ đi (BR07).
const NEAR_ME_ERRORS = { DENIED: 'nearMeDenied', UNAVAILABLE: 'nearMeUnavailable', TIMEOUT: 'nearMeTimeout' };

export default function ExploreScreen({ navigation }) {
  const data = useData();
  const { t, uiLanguage } = useSettings();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [result, setResult] = useState({ status: 'loading', items: [], offline: false, error: null });
  const seq = useRef(0);
  const nearMe = useNearMe();
  const rows = useMemo(
    () => sortByDistance(result.items, nearMe.status === 'on' ? nearMe.origin : null),
    [result.items, nearMe.status, nearMe.origin],
  );

  const search = useCallback(async () => {
    const id = ++seq.current;
    setResult((r) => ({ ...r, status: r.items.length ? 'ready' : 'loading', error: null }));
    try {
      const items = await publicApi.listPois({ q, categoryId });
      if (id === seq.current) setResult({ status: 'ready', items, offline: false, error: null });
    } catch (err) {
      if (id !== seq.current) return;
      // NFR02/UC01-E2: lỗi truy cập -> nếu đã có dữ liệu tải trước thì vẫn cho xem (lọc cục bộ), kèm báo lỗi.
      if (data.pois.length > 0) {
        setResult({ status: 'ready', items: filterPois(data.pois, { q, categoryId }), offline: true, error: err });
      } else {
        setResult({ status: 'error', items: [], offline: false, error: err });
      }
    }
  }, [q, categoryId, data.pois]);

  // Debounce 300 ms khi gõ từ khóa.
  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => { clearTimeout(t); seq.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const catName = (id) => categoryName(data.categories.find((c) => c.id === id), uiLanguage);
  const open = (poi) => navigation.navigate('PoiDetail', { id: poi.id, name: poi.name });

  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.search}
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="search"
          accessibilityLabel={t.search}
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t.all} selected={!categoryId} onPress={() => setCategoryId('')} />
          {data.categories.map((c) => (
            <Chip key={c.id} label={categoryName(c, uiLanguage)} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
        <View style={styles.nearRow}>
          <Chip
            label={nearMe.status === 'locating' ? t.nearMeLocating : t.nearMe}
            selected={nearMe.status === 'on'}
            disabled={nearMe.status === 'locating'}
            onPress={nearMe.status === 'on' ? nearMe.deactivate : nearMe.activate}
          />
          {nearMe.status === 'on' ? <Text style={styles.nearHint}>{t.nearMeActive}</Text> : null}
        </View>
      </View>
      {nearMe.status === 'error' ? <Banner kind="error">{t[NEAR_ME_ERRORS[nearMe.errorCode] ?? 'nearMeUnavailable']}</Banner> : null}

      {USE_MOCK ? <Banner>{t.mock}</Banner> : null}
      {result.offline ? <Banner kind="error">{`${errorText(t, result.error)} ${t.cached}`}</Banner> : null}
      {data.status === 'error' && result.status === 'ready' ? <ErrorState message={errorText(t, data.error)} onRetry={data.reload} /> : null}

      {result.status === 'loading' ? (
        <Loading />
      ) : result.status === 'error' ? (
        <ErrorState message={errorText(t, result.error)} onRetry={() => { data.reload(); search(); }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.poi.id}
          renderItem={({ item: { poi, distance_m } }) => {
            const distanceLabel = nearMe.status === 'on' ? formatDistance(distance_m, uiLanguage) : '';
            return (
              <PoiCard
                poi={poi}
                categoryName={catName(poi.category_id)}
                distanceLabel={distanceLabel}
                distanceA11y={distanceLabel ? t.distanceFromYou.replace('{distance}', distanceLabel) : ''}
                onPress={() => open(poi)}
              />
            );
          }}
          contentContainerStyle={{ paddingVertical: space.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { data.reload(); search(); }} />}
          ListEmptyComponent={
            // UC01-E1: không có kết quả -> thông báo; khách đổi điều kiện ngay trên màn hình.
            <EmptyState title={t.emptyPlaces} hint={t.emptyHint} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { backgroundColor: colors.primary, paddingBottom: space.md, gap: space.sm },
  input: { backgroundColor: '#fff', margin: space.md, marginBottom: 0, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16, color: colors.text },
  chips: { paddingHorizontal: space.md, gap: space.sm },
  nearRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, flexWrap: 'wrap' },
  nearHint: { color: '#fff', fontSize: 12, flexShrink: 1 },
});
