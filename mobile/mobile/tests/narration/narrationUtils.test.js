import { availableLocales, getNarration, pickVoice, splitIntoChunks, voiceMatchesLocale } from '../../src/features/narration/narrationUtils';
import { NarrationPlayer } from '../../src/features/narration/NarrationPlayer';

const poi = {
  narrations: [
    { locale: 'en', title: 'Cathedral', body: 'Built in 1863.' },
    { locale: 'vi', title: 'Nhà thờ', body: 'Xây năm 1863.' },
    { locale: 'fr', title: '', body: '' },
  ],
};

describe('narrationUtils', () => {
  it('chỉ trả ngôn ngữ có nội dung, vi đứng đầu', () => {
    expect(availableLocales(poi)).toEqual(['vi', 'en']);
  });
  it('không tự đổi ngôn ngữ (BR03, UC03-A1)', () => {
    expect(getNarration(poi, 'fr')).toBeNull();
    expect(getNarration({ narrations: [poi.narrations[1]] }, 'en')).toBeNull();
  });
  it('khớp giọng theo mã ngôn ngữ', () => {
    expect(voiceMatchesLocale({ language: 'vi-VN' }, 'vi')).toBe(true);
    expect(voiceMatchesLocale({ language: 'vi_VN' }, 'vi')).toBe(true);
    expect(voiceMatchesLocale({ language: 'en-US' }, 'vi')).toBe(false);
    expect(voiceMatchesLocale({ language: 'vie-VN' }, 'vi')).toBe(false);
  });
  it('pickVoice trả null khi không có giọng đúng ngôn ngữ (BR05)', () => {
    expect(pickVoice([{ language: 'en-US', identifier: 'x' }], 'vi')).toBeNull();
    expect(pickVoice([{ language: 'en-GB', identifier: 'a' }, { language: 'en-US', identifier: 'b' }], 'en').identifier).toBe('b');
  });
  it('splitIntoChunks giữ mỗi đoạn <= max và không mất chữ', () => {
    const text = Array.from({ length: 200 }, (_, i) => `Câu số ${i}.`).join(' ');
    const chunks = splitIntoChunks(text, 300);
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
    expect(splitIntoChunks('   ')).toEqual([]);
    expect(splitIntoChunks('x'.repeat(1000), 100).every((c) => c.length <= 100)).toBe(true);
  });
});

function fakeSpeech({ voices = [{ language: 'vi-VN', identifier: 'v1' }], behaviour = 'ok' } = {}) {
  const spoken = [];
  return {
    spoken,
    maxSpeechInputLength: 4000,
    getAvailableVoicesAsync: async () => voices,
    speak(text, o) {
      spoken.push({ text, language: o.language, voice: o.voice });
      if (behaviour === 'error') return setTimeout(() => o.onError(new Error('x')), 0);
      setTimeout(() => { o.onStart(); setTimeout(() => o.onDone(), 0); }, 0);
    },
    stop() {}, pause() {}, resume() {},
  };
}

describe('NarrationPlayer', () => {
  it('phát bằng giọng đúng ngôn ngữ và trả true khi bắt đầu', async () => {
    const speech = fakeSpeech();
    const p = new NarrationPlayer({ speech });
    expect(await p.play({ text: 'Xin chào', locale: 'vi' })).toBe(true);
    expect(speech.spoken[0]).toMatchObject({ language: 'vi-VN', voice: 'v1' });
  });
  it('thiếu giọng: báo NO_VOICE, không phát (BR05)', async () => {
    const speech = fakeSpeech({ voices: [{ language: 'en-US', identifier: 'e' }] });
    const p = new NarrationPlayer({ speech });
    expect(await p.play({ text: 'Xin chào', locale: 'vi' })).toBe(false);
    expect(p.state.status).toBe('error');
    expect(p.state.errorCode).toBe('NO_VOICE');
    expect(speech.spoken).toHaveLength(0);
  });
  it('không liệt kê được giọng thì không thử phát hoặc báo thành công', async () => {
    const speech = fakeSpeech({ voices: [] });
    const p = new NarrationPlayer({ speech });
    expect(await p.play({ text: 'Xin chào', locale: 'vi' })).toBe(false);
    expect(p.state.errorCode).toBe('NO_VOICE');
    expect(speech.spoken).toHaveLength(0);
  });
  it('lỗi liệt kê giọng không phát với giọng không xác nhận', async () => {
    const speech = fakeSpeech();
    speech.getAvailableVoicesAsync = async () => { throw new Error('unavailable'); };
    const p = new NarrationPlayer({ speech });
    expect(await p.play({ text: 'Hello', locale: 'en' })).toBe(false);
    expect(p.state.errorCode).toBe('NO_VOICE');
    expect(speech.spoken).toHaveLength(0);
  });
  it('TTS lỗi: báo TTS_ERROR và trả false (UC04-E2 không ghi nhận thành công)', async () => {
    const p = new NarrationPlayer({ speech: fakeSpeech({ behaviour: 'error' }) });
    expect(await p.play({ text: 'Xin chào', locale: 'vi' })).toBe(false);
    expect(p.state.errorCode).toBe('TTS_ERROR');
  });
  it('pause bị từ chối khi nền tảng không hỗ trợ (UC03-E2)', async () => {
    const p = new NarrationPlayer({ speech: fakeSpeech(), supportsPause: false });
    await p.play({ text: 'a', locale: 'vi' });
    p.state = { ...p.state, status: 'playing' };
    expect(p.pause()).toBe(false);
  });
});
