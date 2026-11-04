import { NarrationPlayer, PLAYER_ERRORS } from '../../src/features/narration/NarrationPlayer';

const voices = [{ language: 'vi-VN', identifier: 'vi' }, { language: 'en-US', identifier: 'en' }];
let speech;
let player;
beforeEach(() => {
  jest.useFakeTimers();
  speech = {
    getAvailableVoicesAsync: jest.fn(async () => voices),
    speak: jest.fn(), stop: jest.fn(async () => {}),
    pause: jest.fn(async () => {}), resume: jest.fn(async () => {}),
  };
  player = new NarrationPlayer({ speech, supportsPause: true });
});
afterEach(async () => {
  await player.stop();
  jest.clearAllTimers();
  jest.useRealTimers();
});
const opts = () => speech.speak.mock.calls.at(-1)[1];
async function play(locale = 'vi', text = 'Test narration') {
  const result = player.play({ text, locale, poiId: 'p' });
  await jest.advanceTimersByTimeAsync(0);
  opts().onStart();
  expect(await result).toBe(true);
}

test('stop before start resolves false and ignores delayed engine callbacks', async () => {
  const result = player.play({ text: 'Test', locale: 'vi' });
  await jest.advanceTimersByTimeAsync(0);
  const stale = opts();
  await player.stop();
  expect(await result).toBe(false);
  stale.onStart(); stale.onDone(); stale.onError();
  expect(player.state.status).toBe('idle');
});

test('waits for all native stop operations before starting a replacement', async () => {
  let finishOldStop;
  speech.stop.mockImplementationOnce(() => new Promise((resolve) => { finishOldStop = resolve; }));
  const old = player.play({ text: 'Old', locale: 'vi' });
  const current = player.play({ text: 'New', locale: 'en' });
  await jest.advanceTimersByTimeAsync(0);
  expect(speech.speak).not.toHaveBeenCalled();
  finishOldStop();
  await jest.advanceTimersByTimeAsync(0);
  expect(await old).toBe(false);
  expect(speech.speak).toHaveBeenCalledTimes(1);
  expect(opts()).toMatchObject({ language: 'en-US', voice: 'en' });
  opts().onStart();
  expect(await current).toBe(true);
});

test('native stop rejection is handled and does not start another narration', async () => {
  speech.stop.mockRejectedValueOnce(new Error('cannot stop'));
  expect(await player.play({ text: 'Test', locale: 'vi' })).toBe(false);
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.TTS_ERROR);
  expect(speech.speak).not.toHaveBeenCalled();
});

test('changing narration language cancels the old voice and ignores old callbacks', async () => {
  await play('vi');
  const stale = opts();
  await play('en');
  stale.onDone(); stale.onError();
  expect(player.state).toMatchObject({ status: 'playing', locale: 'en' });
  expect(opts().language).toBe('en-US');
});

test('stop while waiting for voices never speaks when they finally arrive', async () => {
  let release;
  speech.getAvailableVoicesAsync.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
  const pending = player.play({ text: 'Test', locale: 'vi' });
  await jest.advanceTimersByTimeAsync(0);
  await player.stop();
  release(voices);
  expect(await pending).toBe(false);
  expect(speech.speak).not.toHaveBeenCalled();
});

test('start timeout reports failure and later callbacks cannot report success', async () => {
  const result = player.play({ text: 'Test', locale: 'vi' });
  await jest.advanceTimersByTimeAsync(8000);
  expect(await result).toBe(false);
  opts().onStart(); opts().onDone();
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.TTS_ERROR);
});

test('engine error after start preserves the error even after a late onDone', async () => {
  await play();
  const current = opts();
  current.onError(); current.onDone();
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.TTS_ERROR);
});

test('unexpected native onStopped offers replay instead of remaining playing', async () => {
  await play();
  opts().onStopped();
  expect(player.state.status).toBe('error');
});

test('iOS pause/resume succeeds and failures stop with a replayable error', async () => {
  await play();
  expect(await player.pause()).toBe(true);
  expect(player.state.status).toBe('paused');
  expect(await player.resume()).toBe(true);
  await player.pause();
  speech.resume.mockRejectedValueOnce(new Error('native resume failed'));
  expect(await player.resume()).toBe(false);
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.TTS_ERROR);
});

test('pause rejection is handled and playback can be started again', async () => {
  await play();
  speech.pause.mockRejectedValueOnce(new Error('native pause failed'));
  expect(await player.pause()).toBe(false);
  expect(player.state.status).toBe('error');
  await play();
  expect(player.state.status).toBe('playing');
});

test('empty narration never calls native speak', async () => {
  expect(await player.play({ text: '   ', locale: 'vi' })).toBe(false);
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.EMPTY_TEXT);
  expect(speech.speak).not.toHaveBeenCalled();
});

test('a later chunk that never starts also times out', async () => {
  speech.maxSpeechInputLength = 12;
  await play('vi', 'First chunk. Second chunk.');
  opts().onDone();
  expect(speech.speak).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(8000);
  expect(player.state.errorCode).toBe(PLAYER_ERRORS.TTS_ERROR);
});
