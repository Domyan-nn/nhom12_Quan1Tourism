import React from 'react';
import renderer, { act } from 'react-test-renderer';
import * as Location from 'expo-location';
import ExploreScreen from '../../src/features/places/ExploreScreen';
import { translations } from '../../src/context/translations';

let mockPois;
const mockListPois = jest.fn(async () => mockPois);
// Phải trả CÙNG một đối tượng ở mọi lần render: màn hình dùng data.pois làm phụ thuộc của hàm tìm kiếm.
const mockData = { pois: [], categories: [], status: 'ready', reload: jest.fn() };
jest.mock('../../src/context/DataContext', () => ({ useData: () => mockData }));
jest.mock('../../src/context/SettingsContext', () => ({
  useSettings: () => ({ t: require('../../src/context/translations').translations.vi, uiLanguage: 'vi' }),
}));
jest.mock('../../src/services', () => ({ USE_MOCK: false, publicApi: { listPois: (...args) => mockListPois(...args) }, mediaUrl: () => null }));
jest.mock('../../src/services/publicApi', () => ({ filterPois: (list) => list }));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('../../src/components/StateViews', () => {
  const R = require('react');
  return Object.fromEntries(['Banner', 'Chip', 'EmptyState', 'ErrorState', 'Loading'].map((name) =>
    [name, (props) => R.createElement(name, props, props.children)]));
});
jest.mock('../../src/components/PoiCard', () => {
  const R = require('react');
  return { __esModule: true, default: (props) => R.createElement('PoiCard', props) };
});

const t = translations.vi;
const poi = (id, latitude, longitude) => ({ id, name: id, address: 'test', category_id: 'c', latitude, longitude });
// Thứ tự ban đầu của API; vị trí khách đặt gần chợ ("cho"): cho < dinh < nhahat < nhatho < buudien.
const LIST = [poi('dinh', 10.777, 106.6953), poi('nhatho', 10.7798, 106.699), poi('buudien', 10.7799, 106.6998), poi('cho', 10.7725, 106.698), poi('nhahat', 10.7766, 106.7032)];
const NEAR_CHO = { coords: { latitude: 10.773, longitude: 106.698, accuracy: 15 } };

let screen;
const navigation = { navigate: jest.fn() };
const flush = () => act(async () => { await Promise.resolve(); });
async function mount() {
  await act(async () => { screen = renderer.create(<ExploreScreen navigation={navigation} />); });
  await act(async () => { jest.advanceTimersByTime(300); await Promise.resolve(); }); // debounce tìm kiếm
  await flush();
}
const cards = () => screen.root.findAllByType('PoiCard');
const order = () => cards().map((c) => c.props.poi.id);
const nearChip = () => screen.root.findAllByType('Chip').find((c) => [t.nearMe, t.nearMeLocating].includes(c.props.label));
const press = async (chip) => { await act(async () => { await chip.props.onPress(); }); await flush(); };
const banners = () => screen.root.findAllByType('Banner').map((b) => b.props.children);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPois = LIST;
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  Location.hasServicesEnabledAsync.mockResolvedValue(true);
  Location.getCurrentPositionAsync.mockResolvedValue(NEAR_CHO);
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; jest.useRealTimers(); });

test('chưa bấm Gần tôi: giữ thứ tự của API, không hỏi quyền, không có khoảng cách', async () => {
  await mount();
  expect(order()).toEqual(['dinh', 'nhatho', 'buudien', 'cho', 'nhahat']);
  expect(cards().every((c) => !c.props.distanceLabel)).toBe(true);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test('bấm Gần tôi: sắp theo khoảng cách và hiện khoảng cách; bấm lại thì về thứ tự cũ', async () => {
  await mount();
  await press(nearChip());
  expect(order()).toEqual(['cho', 'dinh', 'nhahat', 'nhatho', 'buudien']);
  expect(cards()[0].props.distanceLabel).toMatch(/^~\d+ m$/);
  expect(cards().every((c) => c.props.distanceLabel && c.props.distanceA11y.startsWith('Cách bạn'))).toBe(true);
  expect(nearChip().props.selected).toBe(true);
  expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

  await press(nearChip());
  expect(order()).toEqual(['dinh', 'nhatho', 'buudien', 'cho', 'nhahat']);
  expect(cards().every((c) => !c.props.distanceLabel)).toBe(true);
});

test('từ chối quyền vị trí: báo lý do, giữ thứ tự cũ, không đọc vị trí', async () => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
  await mount();
  await press(nearChip());
  expect(banners()).toContain(t.nearMeDenied);
  expect(order()).toEqual(['dinh', 'nhatho', 'buudien', 'cho', 'nhahat']);
  expect(nearChip().props.selected).toBe(false);
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('dịch vụ vị trí tắt: báo không xác định được vị trí, giữ thứ tự cũ', async () => {
  Location.hasServicesEnabledAsync.mockResolvedValue(false);
  await mount();
  await press(nearChip());
  expect(banners()).toContain(t.nearMeUnavailable);
  expect(order()).toEqual(['dinh', 'nhatho', 'buudien', 'cho', 'nhahat']);
});

test('địa điểm hỏng tọa độ xếp cuối và không có khoảng cách', async () => {
  mockPois = [poi('hong', null, null), ...LIST];
  await mount();
  await press(nearChip());
  expect(order()).toEqual(['cho', 'dinh', 'nhahat', 'nhatho', 'buudien', 'hong']);
  expect(cards().at(-1).props.distanceLabel).toBe('');
});

test('BR07: vị trí của khách không đi vào lời gọi API nào', async () => {
  await mount();
  await press(nearChip());
  const sent = JSON.stringify(mockListPois.mock.calls);
  expect(sent).not.toContain('10.773');
  expect(sent).not.toContain('106.698');
});
