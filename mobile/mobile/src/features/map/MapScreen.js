// UC02: bản đồ (IMap) với điểm đánh dấu địa điểm công khai.
// A1: vị trí khách chỉ hiện khi đã cấp quyền; từ chối quyền vẫn xem bản đồ.
// E1: bản đồ không tải được -> báo lỗi, gợi ý dùng danh sách. E2: điểm vừa bị ẩn -> báo không khả dụng.
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Banner, Button, EmptyState, ErrorState, Loading } from '../../components/StateViews';
import { useData } from '../../context/DataContext';
import { colors, radius, shadow, space } from '../../theme';

const Q1_CENTER = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.025, longitudeDelta: 0.025 };
const MAP_LOAD_TIMEOUT_MS = 12_000;

export default function MapScreen({ navigation }) {
  const data = useData();
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(null);
  const [locGranted, setLocGranted] = useState(false);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((p) => setLocGranted(p.granted)).catch(() => {});
  }, []);

  useEffect(() => {
    if (mapReady) return undefined;
    const t = setTimeout(() => setMapFailed(true), MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || data.pois.length === 0) return;
    mapRef.current?.fitToCoordinates(
      data.pois.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 80, right: 60, bottom: 200, left: 60 }, animated: true }
    );
  }, [mapReady, data.pois]);

  const askLocation = async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    setLocGranted(res.granted);
    if (!res.granted) setNotice('Bạn chưa cấp quyền vị trí nên bản đồ không hiện vị trí của bạn. Vẫn có thể xem các địa điểm.');
    else setNotice(null);
  };

  const onMarker = async (poi) => {
    setSelected(poi);
    setNotice(null);
    setChecking(true);
    try {
      // Bước 4: kiểm tra điểm còn Công khai.
      await data.getDetail(poi.id, { force: true });
    } catch (err) {
      if (err?.status === 404) {
        data.dropPoi(poi.id);
        setSelected(null);
        setNotice('Địa điểm này không còn khả dụng. Hãy chọn địa điểm khác.');
      }
      // Lỗi mạng: vẫn cho xem tóm tắt từ dữ liệu đã tải.
    } finally {
      setChecking(false);
    }
  };

  if (data.status === 'loading') return <Loading />;
  if (data.status === 'error') return <ErrorState message={data.error} onRetry={data.reload} />;
  if (mapFailed && !mapReady) {
    return (
      <ErrorState message="Không tải được bản đồ. Kiểm tra kết nối hoặc khóa bản đồ, hoặc dùng danh sách địa điểm.">
        <Button title="Mở danh sách" onPress={() => navigation.navigate('Explore')} />
      </ErrorState>
    );
  }
  if (data.pois.length === 0) return <EmptyState title="Chưa có địa điểm công khai" hint="Quay lại sau khi Admin công bố địa điểm." />;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={Q1_CENTER}
        showsUserLocation={locGranted}
        showsMyLocationButton={locGranted}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelected(null)}
        accessibilityLabel="Bản đồ các địa điểm Quận 1"
      >
        {data.pois.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.name}
            pinColor={selected?.id === p.id ? colors.accent : colors.primary}
            onPress={(e) => { e.stopPropagation?.(); onMarker(p); }}
          />
        ))}
      </MapView>

      <View style={styles.top} pointerEvents="box-none">
        {data.stale ? <Banner kind="error">Không cập nhật được dữ liệu; đang dùng dữ liệu đã tải.</Banner> : null}
        {notice ? <Banner>{notice}</Banner> : null}
        {!locGranted ? <Button title="Hiện vị trí của tôi" kind="ghost" style={styles.locBtn} onPress={askLocation} /> : null}
      </View>

      {selected ? (
        <View style={styles.sheet}>
          <Text style={styles.sheetName}>{selected.name}</Text>
          <Text style={styles.sheetAddr}>{selected.address}</Text>
          <Pressable
            disabled={checking}
            onPress={() => navigation.navigate('PoiDetail', { id: selected.id, name: selected.name })}
            style={[styles.detailBtn, checking && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={styles.detailText}>{checking ? 'Đang kiểm tra…' : 'Xem chi tiết'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', top: space.sm, left: 0, right: 0 },
  locBtn: { alignSelf: 'flex-end', marginRight: space.md, backgroundColor: '#fff', paddingVertical: 8 },
  sheet: { position: 'absolute', left: space.md, right: space.md, bottom: space.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: 4, ...shadow },
  sheetName: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetAddr: { color: colors.muted, fontSize: 14 },
  detailBtn: { marginTop: space.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  detailText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
