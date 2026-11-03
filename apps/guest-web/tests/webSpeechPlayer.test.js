import test from 'node:test';
import assert from 'node:assert/strict';
import { TTS_ERRORS, WebSpeechPlayer, pickVoice, splitIntoChunks, voiceMatchesLocale } from '../src/tts/webSpeechPlayer.js';

class FakeUtterance { constructor(text) { this.text = text; } }
const tick = () => new Promise((r) => setTimeout(r, 0));

function fakeSynth({ voices = [{ lang: 'vi-VN', name: 'Vi' }, { lang: 'en-US', name: 'En' }], lateVoices = false, behaviour = 'ok', canPause = true } = {}) {
  const listeners = {};
  let list = lateVoices ? [] : voices;
  const synth = {
    spoken: [], paused: false, cancelled: 0,
    getVoices: () => list,
    addEventListener: (n, fn) => { listeners[n] = fn; },
    removeEventListener: (n) => { delete listeners[n]; },
    fireVoices: () => { list = voices; listeners.voiceschanged?.(); },
    speak(u) {
      synth.spoken.push({ text: u.text, lang: u.lang, voice: u.voice });
      if (behaviour === 'silent') return;
      setTimeout(() => {
        if (behaviour === 'error') return u.onerror({ error: 'synthesis-failed' });
        u.onstart();
        if (behaviour === 'ok') setTimeout(() => u.onend(), 0);
      }, 0);
    },
    cancel() { synth.cancelled++; synth.paused = false; },
    pause() { if (canPause) synth.paused = true; },
    resume() { synth.paused = false; },
  };
  return synth;
}
const make = (synth, extra = {}) => new WebSpeechPlayer({ synth, Utterance: FakeUtterance, ...extra });

test('voiceMatchesLocale and pickVoice only accept the requested language (BR05)', () => {
  assert.equal(voiceMatchesLocale({ lang: 'vi-VN' }, 'vi'), true);
  assert.equal(voiceMatchesLocale({ lang: 'vi_VN' }, 'vi'), true);
  assert.equal(voiceMatchesLocale({ lang: 'en-US' }, 'vi'), false);
  assert.equal(voiceMatchesLocale({ lang: 'vie-VN' }, 'vi'), false);
  assert.equal(pickVoice([{ lang: 'en-US' }], 'vi'), null);
  assert.equal(pickVoice([{ lang: 'en-GB' }, { lang: 'en-US' }], 'en').lang, 'en-US');
  assert.equal(pickVoice([{ lang: 'en-GB' }, { lang: 'en-AU', default: true }], 'en').lang, 'en-AU');
});

test('splitIntoChunks keeps chunks short and loses no words', () => {
  const text = Array.from({ length: 80 }, (_, i) => `Câu số ${i}.`).join(' ');
  const chunks = splitIntoChunks(text, 100);
  assert.ok(chunks.every((c) => c.length <= 100));
  assert.equal(chunks.join(' '), text);
  assert.deepEqual(splitIntoChunks('   '), []);
  assert.ok(splitIntoChunks('x'.repeat(500), 100).every((c) => c.length <= 100));
});

test('plays with a voice of the right language and reports success', async () => {
  const synth = fakeSynth();
  const p = make(synth);
  assert.equal(await p.play({ text: 'Xin chào', locale: 'vi', key: 'a' }), true);
  assert.equal(synth.spoken[0].lang, 'vi-VN');
  assert.equal(synth.spoken[0].voice.name, 'Vi');
  await tick(); await tick();
  assert.equal(p.state.status, 'idle'); // đọc xong
});

test('missing voice for the language: NO_VOICE, nothing is spoken (BR05)', async () => {
  const synth = fakeSynth({ voices: [{ lang: 'en-US', name: 'En' }] });
  const p = make(synth, { voicesWaitMs: 5 });
  assert.equal(await p.play({ text: 'Xin chào', locale: 'vi' }), false);
  assert.equal(p.state.status, 'error');
  assert.equal(p.state.errorCode, TTS_ERRORS.NO_VOICE);
  assert.equal(synth.spoken.length, 0);
});

test('waits for voices that load late (Chrome voiceschanged)', async () => {
  const synth = fakeSynth({ lateVoices: true });
  const p = make(synth, { voicesWaitMs: 1000 });
  const result = p.play({ text: 'Xin chào', locale: 'vi' });
  await tick();
  synth.fireVoices();
  assert.equal(await result, true);
});

test('voices never load: NO_VOICE rather than speaking with an unknown voice', async () => {
  const p = make(fakeSynth({ voices: [], lateVoices: true }), { voicesWaitMs: 5 });
  assert.equal(await p.play({ text: 'a', locale: 'en' }), false);
  assert.equal(p.state.errorCode, TTS_ERRORS.NO_VOICE);
});

test('unsupported browser and empty text are reported', async () => {
  const none = new WebSpeechPlayer({ synth: undefined, Utterance: undefined });
  assert.equal(none.isSupported, false);
  assert.equal(await none.play({ text: 'a', locale: 'vi' }), false);
  assert.equal(none.state.errorCode, TTS_ERRORS.UNSUPPORTED);
  const p = make(fakeSynth());
  assert.equal(await p.play({ text: '   ', locale: 'vi' }), false);
  assert.equal(p.state.errorCode, TTS_ERRORS.EMPTY_TEXT);
});

test('speech engine error is reported as TTS_ERROR', async () => {
  const p = make(fakeSynth({ behaviour: 'error' }));
  assert.equal(await p.play({ text: 'Xin chào', locale: 'vi' }), false);
  assert.equal(p.state.errorCode, TTS_ERRORS.TTS_ERROR);
});

test('never started within the timeout: TTS_ERROR', async () => {
  const p = make(fakeSynth({ behaviour: 'silent' }), { startTimeoutMs: 10 });
  assert.equal(await p.play({ text: 'Xin chào', locale: 'vi' }), false);
  assert.equal(p.state.errorCode, TTS_ERRORS.TTS_ERROR);
});

test('pause and resume when supported', async () => {
  const synth = fakeSynth({ behaviour: 'hold' });
  const p = make(synth);
  await p.play({ text: 'Xin chào', locale: 'vi' });
  assert.equal(p.pause(), true);
  assert.equal(p.state.status, 'paused');
  assert.equal(p.resume(), true);
  assert.equal(p.state.status, 'playing');
});

test('pause unsupported: stops and asks the visitor to replay (UC03-E2)', async () => {
  const synth = fakeSynth({ behaviour: 'hold', canPause: false });
  const p = make(synth);
  await p.play({ text: 'Xin chào', locale: 'vi', key: 'k' });
  assert.equal(p.pause(), false);
  assert.equal(p.state.status, 'error');
  assert.equal(p.state.errorCode, TTS_ERRORS.PAUSE_UNSUPPORTED);
  assert.ok(synth.cancelled > 0);
  assert.equal(await p.play({ text: 'Xin chào', locale: 'vi', key: 'k' }), true); // Phát lại
});

test('stop returns to idle and playing a new text cancels the previous one', async () => {
  const synth = fakeSynth({ behaviour: 'hold' });
  const p = make(synth);
  await p.play({ text: 'Một', locale: 'vi' });
  p.stop();
  assert.equal(p.state.status, 'idle');
  await p.play({ text: 'Hai', locale: 'en' });
  assert.equal(synth.spoken.at(-1).lang, 'en-US');
});

test('long text is read in several short utterances in order', async () => {
  const synth = fakeSynth();
  const p = make(synth, { maxChunk: 30 });
  await p.play({ text: 'Câu một dài. Câu hai cũng dài. Câu ba nữa đây. Câu bốn kết thúc.', locale: 'vi' });
  for (let i = 0; i < 12; i++) await tick();
  assert.ok(synth.spoken.length >= 3);
  assert.equal(p.state.status, 'idle');
});
