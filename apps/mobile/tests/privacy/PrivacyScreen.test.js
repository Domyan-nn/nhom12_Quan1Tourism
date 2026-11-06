import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PrivacyScreen from '../../src/features/privacy/PrivacyScreen';
import { translations } from '../../src/context/translations';

let mockPrivacy;
jest.mock('../../src/features/privacy/PrivacyContext', () => ({ usePrivacy: () => mockPrivacy }));
jest.mock('../../src/context/SettingsContext', () => ({ useSettings: () => ({ t: require('../../src/context/translations').translations.vi }) }));
jest.mock('../../src/services', () => ({ USE_MOCK: false }));
jest.mock('../../src/components/StateViews', () => {
  const R = require('react');
  return Object.fromEntries(['Banner', 'Button'].map((name) => [name, (props) => R.createElement(name, props, props.children)]));
});

let screen;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mockPrivacy = { consent: 'denied', hasPendingRevoke: false, storageError: false,
    grant: jest.fn(async () => true), decline: jest.fn(async () => true), revoke: jest.fn(async () => false) };
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; });

test.each(['hasPendingRevoke', 'storageError'])('cannot grant while %s and explains why', async (reason) => {
  mockPrivacy[reason] = true;
  await act(async () => { screen = renderer.create(<PrivacyScreen />); });
  expect(screen.root.findByType('Button').props.disabled).toBe(true);
  expect(screen.root.findAllByType('Banner').some((banner) => banner.props.children ===
    (reason === 'storageError' ? translations.vi.privacyStorageError : translations.vi.pendingRevoke))).toBe(true);
  expect(mockPrivacy.grant).not.toHaveBeenCalled();
});

test('failed withdrawal says pending instead of confirming server success', async () => {
  mockPrivacy.consent = 'granted';
  await act(async () => { screen = renderer.create(<PrivacyScreen />); });
  await act(async () => screen.root.findByType('Button').props.onPress());
  expect(mockPrivacy.revoke).toHaveBeenCalledTimes(1);
  expect(screen.root.findByType('Banner').props.children).toBe(translations.vi.withdrawPending);
});

test('failed decline does not claim the choice was saved or a withdrawal is pending', async () => {
  mockPrivacy.consent = null;
  mockPrivacy.decline.mockResolvedValue(false);
  await act(async () => { screen = renderer.create(<PrivacyScreen />); });
  await act(async () => screen.root.findAllByType('Button').find((button) => button.props.title === translations.vi.declineButton).props.onPress());
  expect(mockPrivacy.decline).toHaveBeenCalledTimes(1);
  const banner = screen.root.findByType('Banner');
  expect(banner.props.children).toBe(translations.vi.privacyStorageError);
  expect(banner.props.kind).toBe('error');
});
