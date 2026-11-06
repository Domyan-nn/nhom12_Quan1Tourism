import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { analyticsApi, storage } from '../../src/services';
import { PrivacyProvider, usePrivacy } from '../../src/features/privacy/PrivacyContext';
import { ANALYTICS_STORAGE_KEYS as K } from '../../src/features/privacy/AnalyticsClient';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'new-session') }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }));
jest.mock('../../src/services', () => ({
  USE_MOCK: true,
  analyticsApi: { heartbeat: jest.fn(async () => null), revoke: jest.fn(async () => null) },
  storage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

let screen;
let privacy;
function Probe() { privacy = usePrivacy(); return null; }
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; jest.restoreAllMocks(); });

test('mock provider neither acknowledges a stored real withdrawal nor grants a new tracking ID', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  const memory = new Map([[K.consent, 'denied'], [K.pendingRevoke, 'real-session']]);
  storage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
  storage.setItem.mockImplementation(async (key, value) => void memory.set(key, value));
  storage.removeItem.mockImplementation(async (key) => void memory.delete(key));
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  NetInfo.addEventListener.mockImplementation((listener) => {
    listener({ isConnected: true, isInternetReachable: true });
    return jest.fn();
  });
  await act(async () => { screen = renderer.create(<PrivacyProvider><Probe /></PrivacyProvider>); });
  expect(privacy).toMatchObject({ ready: true, isMock: true, hasPendingRevoke: true });
  await act(async () => { expect(await privacy.grant()).toBe(false); });
  expect(memory.get(K.pendingRevoke)).toBe('real-session');
  expect(Crypto.randomUUID).not.toHaveBeenCalled();
  expect(analyticsApi.heartbeat).not.toHaveBeenCalled();
  expect(analyticsApi.revoke).not.toHaveBeenCalled();
});
