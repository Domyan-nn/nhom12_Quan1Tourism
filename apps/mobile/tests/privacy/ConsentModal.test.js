import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import ConsentModal from '../../src/features/privacy/ConsentModal';
import { AnalyticsClient } from '../../src/features/privacy/AnalyticsClient';
import { translations } from '../../src/context/translations';

let mockClient;
let mockIsMock = false;
jest.mock('../../src/features/privacy/PrivacyContext', () => ({ usePrivacy: () => {
  const R = require('react');
  const [snapshot, setSnapshot] = R.useState(() => mockClient.snapshot());
  R.useEffect(() => mockClient.subscribe(setSnapshot), []);
  return { ready: true, isMock: mockIsMock, ...snapshot, grant: () => mockClient.grant(), decline: () => mockClient.decline() };
} }));
jest.mock('../../src/context/SettingsContext', () => ({ useSettings: () => ({ t: require('../../src/context/translations').translations.vi }) }));
jest.mock('../../src/components/StateViews', () => {
  const R = require('react');
  return Object.fromEntries(['Banner', 'Button'].map((name) => [name, (props) => R.createElement(name, props, props.children)]));
});

let screen;
beforeEach(() => { mockIsMock = false; });
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; });

test('failed consent keeps the error visible; decline still allows public browsing when storage is unavailable', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const api = { heartbeat: jest.fn(), revoke: jest.fn() };
  const storage = { getItem: async () => null, setItem: async () => { throw new Error('storage unavailable'); }, removeItem: async () => {} };
  const client = new AnalyticsClient({ storage, api, randomId: () => 'test-session' });
  mockClient = client;
  await client.init();
  client.setRunning(true);
  await act(async () => { screen = renderer.create(<ConsentModal />); });
  await act(async () => screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.consentAccept).props.onPress());
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  expect(screen.root.findByType('Banner').props.children).toBe(translations.vi.privacyStorageError);
  expect(screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.consentAccept).props.disabled).toBe(true);
  const decline = screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.consentDecline);
  expect(decline.props.disabled).toBe(false);
  await act(async () => decline.props.onPress());
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
  expect(client.consent).toBe('denied');
  expect(api.heartbeat).not.toHaveBeenCalled();
  expect(api.revoke).not.toHaveBeenCalled();
  client.setRunning(false);
});

test('mock consent explains analytics is unavailable and offers decline without creating a session', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const randomId = jest.fn();
  mockIsMock = true;
  mockClient = new AnalyticsClient({ storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    api: { heartbeat: jest.fn(), revoke: jest.fn() }, randomId, enabled: false });
  await mockClient.init();
  await act(async () => { screen = renderer.create(<ConsentModal />); });
  expect(screen.root.findByType('Banner').props.children).toBe(translations.vi.analyticsMock);
  expect(screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.consentAccept).props.disabled).toBe(true);
  await act(async () => screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.consentDecline).props.onPress());
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
  expect(randomId).not.toHaveBeenCalled();
});
