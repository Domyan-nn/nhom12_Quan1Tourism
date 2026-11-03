import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MapScreen from '../../src/features/map/MapScreen';
import { translations } from '../../src/context/translations';
import * as Location from 'expo-location';

let mockData;
const mockFit = jest.fn();
jest.mock('../../src/context/DataContext', () => ({ useData: () => mockData }));
jest.mock('../../src/context/SettingsContext', () => ({ useSettings: () => ({ t: require('../../src/context/translations').translations.vi }) }));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));
jest.mock('react-native-maps', () => {
  const R = require('react');
  return { __esModule: true, default: R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ fitToCoordinates: mockFit }));
    return R.createElement('MapView', props, props.children);
  }), Marker: (props) => R.createElement('Marker', props) };
});
jest.mock('../../src/components/StateViews', () => {
  const R = require('react');
  return Object.fromEntries(['Banner', 'Button', 'EmptyState', 'ErrorState', 'Loading'].map((name) =>
    [name, (props) => R.createElement(name, props, props.children)]));
});

const p = (id, latitude = 10.77) => ({ id, name: id, address: 'test', latitude, longitude: 106.69 });
const t = translations.vi;
let screen;
const navigation = { navigate: jest.fn() };
async function mount() { await act(async () => { screen = renderer.create(<MapScreen navigation={navigation} />); }); }

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); jest.clearAllMocks();
  mockData = { status: 'ready', pois: [p('a'), p('bad', null)], getDetail: jest.fn(async (id) => p(id)), dropPoi: jest.fn(), reload: jest.fn() };
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; jest.useRealTimers(); });

test('draws and fits the same valid markers and still works when GPS is denied', async () => {
  await mount();
  expect(screen.root.findAllByType('Marker')).toHaveLength(1);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => screen.root.findByType('MapView').props.onMapReady());
  expect(mockFit).toHaveBeenCalledWith([{ latitude: 10.77, longitude: 106.69 }], expect.any(Object));
  await act(async () => screen.root.findAllByType('Button').find((b) => b.props.title === t.showLocation).props.onPress());
  expect(screen.root.findByType('MapView').props.showsUserLocation).toBe(false);
  expect(screen.root.findAllByType('Marker')).toHaveLength(1);
});

test.each([{ pois: [] }, { pois: [p('bad', null)] }])('empty or all invalid input renders fallback without mounting native map: %j', async ({ pois }) => {
  mockData.pois = pois; await mount();
  expect(screen.root.findAllByType('MapView')).toHaveLength(0);
  expect(screen.root.findByType('EmptyState').props.title).toBe(pois.length ? t.noMapMarkers : t.noPublished);
  await act(async () => jest.advanceTimersByTime(15000));
  expect(screen.root.findAllByType('ErrorState')).toHaveLength(0);
});

test('slow API does not start map timeout; API errors offer retry', async () => {
  mockData.status = 'loading'; await mount();
  await act(async () => jest.advanceTimersByTime(15000));
  expect(screen.root.findAllByType('ErrorState')).toHaveLength(0);
  mockData = { ...mockData, status: 'error', error: { code: 'NETWORK_ERROR' } };
  await act(async () => screen.update(<MapScreen navigation={navigation} />));
  expect(screen.root.findByType('ErrorState').props.message).toBe(t.networkError);
  screen.root.findByType('ErrorState').props.onRetry();
  expect(mockData.reload).toHaveBeenCalledTimes(1);
});

test('native map timeout retries and provides list navigation', async () => {
  await mount();
  await act(async () => jest.advanceTimersByTime(12000));
  const error = screen.root.findByType('ErrorState');
  expect(error.props.message).toBe(t.mapFailed);
  screen.root.findAllByType('Button').find((b) => b.props.title === t.openList).props.onPress();
  expect(navigation.navigate).toHaveBeenCalledWith('Explore');
  await act(async () => error.props.onRetry());
  expect(screen.root.findAllByType('ErrorState')).toHaveLength(0);
  await act(async () => screen.root.findByType('MapView').props.onMapReady());
  expect(screen.root.findAllByType('Loading')).toHaveLength(0);
});

test('a failed refresh keeps valid markers visible and offers API retry', async () => {
  mockData.stale = true; mockData.error = { code: 'NETWORK_ERROR' };
  await mount();
  expect(screen.root.findAllByType('Marker')).toHaveLength(1);
  expect(screen.root.findAllByType('Banner').some((b) => b.props.children.includes(t.networkError))).toBe(true);
  screen.root.findAllByType('Button').find((b) => b.props.title === t.retry).props.onPress();
  expect(mockData.reload).toHaveBeenCalledTimes(1);
});

test('hidden marker is removed and a network failure cannot open unchecked detail', async () => {
  mockData.getDetail.mockRejectedValueOnce({ status: 404 });
  await mount();
  await act(async () => screen.root.findByType('Marker').props.onPress({}));
  expect(mockData.dropPoi).toHaveBeenCalledWith('a');
  expect(screen.root.findAllByType('Banner').some((b) => b.props.children === t.locationGone)).toBe(true);
  mockData.getDetail.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });
  await act(async () => screen.root.findByType('Marker').props.onPress({}));
  expect(screen.root.findAllByType('Banner').some((b) => b.props.children === t.networkError)).toBe(true);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('a stale 404 response cannot clear the newer selected marker', async () => {
  let rejectFirst;
  mockData.pois = [p('a'), p('b')];
  mockData.getDetail.mockImplementation((id) => id === 'a' ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve(p('b')));
  await mount();
  await act(async () => { screen.root.findAllByType('Marker')[0].props.onPress({}); });
  await act(async () => screen.root.findAllByType('Marker')[1].props.onPress({}));
  await act(async () => rejectFirst({ status: 404 }));
  expect(mockData.dropPoi).not.toHaveBeenCalled();
  expect(JSON.stringify(screen.toJSON())).toContain('b');
  const detailButton = screen.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.disabled === false)[0];
  detailButton.props.onPress();
  expect(navigation.navigate).toHaveBeenCalledWith('PoiDetail', { id: 'b', name: 'b' });
});
