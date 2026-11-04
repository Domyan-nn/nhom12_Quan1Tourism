import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NarrationPanel from '../../src/features/narration/NarrationPanel';
import { player } from '../../src/features/narration/player';
import { translations } from '../../src/context/translations';

let mockSettings;
let mockPlayerState;
jest.mock('../../src/context/SettingsContext', () => ({ useSettings: () => mockSettings }));
jest.mock('../../src/features/narration/usePlayer', () => ({ usePlayerState: () => mockPlayerState }));
jest.mock('../../src/features/narration/player', () => ({ player: {
  state: { poiId: 'p' }, stop: jest.fn(), play: jest.fn(), supportsPause: false,
} }));
jest.mock('../../src/components/StateViews', () => {
  const R = require('react');
  return Object.fromEntries(['Banner', 'Button', 'Chip'].map((name) =>
    [name, (props) => R.createElement(name, props, props.children)]));
});
const poi = { id: 'p', narrations: [
  { locale: 'vi', title: 'Title vi', body: 'Body vi' },
  { locale: 'fr', title: 'Titre', body: 'Texte' },
  { locale: 'en', title: '', body: '' },
] };
let screen;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockSettings = { locale: 'vi', t: translations.vi, setLocale: jest.fn() };
  mockPlayerState = { poiId: 'p', status: 'idle' };
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; });
async function mount() { await act(async () => { screen = renderer.create(<NarrationPanel poi={poi} />); }); }

test('offers exactly the languages with actual database text, including beyond VI/EN', async () => {
  await mount();
  expect(screen.root.findAllByType('Chip').map((c) => c.props.label)).toEqual(['Tiếng Việt', 'fr']);
  await act(async () => screen.root.findAllByType('Chip')[1].props.onPress());
  expect(mockSettings.setLocale).toHaveBeenCalledWith('fr');
  expect(player.stop).toHaveBeenCalled();
});

test('UI language is independent of narration and unmount stops the current place', async () => {
  await mount();
  mockSettings = { ...mockSettings, t: translations.en };
  await act(async () => screen.update(<NarrationPanel poi={poi} />));
  const listen = screen.root.findAllByType('Button').find((b) => b.props.title === 'Listen');
  await act(async () => listen.props.onPress());
  expect(player.play).toHaveBeenCalledWith({ text: 'Title vi. Body vi', locale: 'vi', poiId: 'p' });
  expect(mockSettings.setLocale).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
  screen = null;
  expect(player.stop).toHaveBeenCalled();
});

test('missing content never falls back to another language', async () => {
  mockSettings.locale = 'en';
  await mount();
  expect(screen.root.findAllByType('Button')).toHaveLength(0);
  expect(screen.root.findByType('Banner').props.children).toBe(translations.vi.missingNarration);
  expect(player.play).not.toHaveBeenCalled();
});

test('Android without pause exposes Stop and keeps text visible during engine errors', async () => {
  mockPlayerState = { poiId: 'p', status: 'playing' };
  await mount();
  expect(screen.root.findAllByType('Button').map((b) => b.props.title)).toEqual(['Dừng']);
  mockPlayerState = { poiId: 'p', status: 'error', errorCode: 'NO_VOICE' };
  await act(async () => screen.update(<NarrationPanel poi={poi} />));
  expect(screen.root.findByType('Banner').props.children).toBe(translations.vi.noVoice);
  expect(JSON.stringify(screen.toJSON())).toContain('Body vi');
  expect(screen.root.findByType('Button').props.title).toBe('Nghe lại');
});
