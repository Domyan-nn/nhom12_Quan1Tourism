// Bộ phát TTS (ITTS) cho UC03/UC04. Nhận module `speech` (expo-speech) qua tham số để kiểm thử được.
// BR05: không có giọng phù hợp hoặc phát lỗi -> báo lý do, KHÔNG tự đổi sang giọng sai ngôn ngữ.

import { pickVoice, speechTagFor, splitIntoChunks } from './narrationUtils';

export const PLAYER_ERRORS = Object.freeze({
  NO_VOICE: 'NO_VOICE',
  TTS_ERROR: 'TTS_ERROR',
  EMPTY_TEXT: 'EMPTY_TEXT',
});

const START_TIMEOUT_MS = 8000;
const IDLE = { status: 'idle', errorCode: null, message: null, poiId: null, locale: null };

export class NarrationPlayer {
  /**
   * @param {object} deps
   * @param {object} deps.speech  Module expo-speech (hoặc bản giả khi test)
   * @param {boolean} deps.supportsPause  iOS: true. Android không hỗ trợ pause (UC03-E2).
   */
  constructor({ speech, supportsPause = false, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout }) {
    this.speech = speech;
    this.supportsPause = supportsPause;
    this._setTimeout = setTimeoutFn;
    this._clearTimeout = clearTimeoutFn;
    this.state = { ...IDLE };
    this.listeners = new Set();
    this._token = 0;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _set(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  get isActive() {
    return this.state.status === 'loading' || this.state.status === 'playing' || this.state.status === 'paused';
  }

  /**
   * Phát một bài. Trả true nếu TTS đã BẮT ĐẦU phát (dùng để ghi nhận "phát thành công" ở UC04).
   * Trả false nếu lỗi; khi đó state.status = 'error' kèm lý do để UI cho khách đọc văn bản.
   */
  async play({ text, locale, poiId = null }) {
    this.stop({ silent: true });
    const token = ++this._token;

    const chunks = splitIntoChunks(text, Math.min(this.speech.maxSpeechInputLength || 4000, 3500));
    if (chunks.length === 0) return this._fail(token, PLAYER_ERRORS.EMPTY_TEXT, 'Bài thuyết minh không có nội dung.', poiId, locale);

    this._set({ status: 'loading', errorCode: null, message: null, poiId, locale });

    let voice = null;
    let voices = [];
    try {
      voices = (await this.speech.getAvailableVoicesAsync()) ?? [];
    } catch {
      voices = [];
    }
    if (token !== this._token) return false; // đã bị dừng/phát bài khác trong lúc chờ

    if (voices.length > 0) {
      voice = pickVoice(voices, locale);
      if (!voice) {
        return this._fail(token, PLAYER_ERRORS.NO_VOICE, `Thiết bị chưa có giọng đọc cho ngôn ngữ "${locale}". Bạn có thể đọc văn bản bên dưới.`, poiId, locale);
      }
    }
    // voices rỗng: một số máy Android không liệt kê giọng; thử phát với mã ngôn ngữ và dựa vào onError.

    return new Promise((resolve) => {
      let started = false;
      let settled = false;
      const settle = (ok) => {
        if (settled) return;
        settled = true;
        this._clearTimeout(watchdog);
        resolve(ok);
      };
      const watchdog = this._setTimeout(() => {
        if (!started && token === this._token) {
          this.speech.stop?.();
          this._fail(token, PLAYER_ERRORS.TTS_ERROR, 'Không bắt đầu đọc được. Bạn có thể đọc văn bản bên dưới.', poiId, locale);
          settle(false);
        }
      }, START_TIMEOUT_MS);

      const speakChunk = (i) => {
        if (token !== this._token) return settle(false);
        const opts = {
          language: voice?.language ?? speechTagFor(locale),
          onStart: () => {
            if (token !== this._token) return;
            if (!started) {
              started = true;
              this._set({ status: 'playing' });
              settle(true);
            }
          },
          onDone: () => {
            if (token !== this._token) return;
            if (i + 1 < chunks.length) speakChunk(i + 1);
            else this._set({ ...IDLE });
          },
          onStopped: () => {},
          onError: () => {
            if (token !== this._token) return;
            this._fail(token, PLAYER_ERRORS.TTS_ERROR, 'Không đọc được bằng TTS. Bạn có thể đọc văn bản bên dưới.', poiId, locale);
            settle(false);
          },
        };
        if (voice?.identifier) opts.voice = voice.identifier;
        try {
          this.speech.speak(chunks[i], opts);
        } catch {
          opts.onError();
        }
      };
      speakChunk(0);
    });
  }

  _fail(token, code, message, poiId, locale) {
    if (token === this._token) this._set({ status: 'error', errorCode: code, message, poiId, locale });
    return false;
  }

  pause() {
    if (this.state.status !== 'playing' || !this.supportsPause) return false;
    this.speech.pause?.();
    this._set({ status: 'paused' });
    return true;
  }

  resume() {
    if (this.state.status !== 'paused') return false;
    this.speech.resume?.();
    this._set({ status: 'playing' });
    return true;
  }

  stop({ silent = false } = {}) {
    this._token++;
    try {
      this.speech.stop?.();
    } catch {
      /* bỏ qua */
    }
    if (!silent) this._set({ ...IDLE });
  }
}
