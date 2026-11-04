// UC03 trên web khách: nghe thuyết minh bằng Web Speech API (ITTS). Không phụ thuộc React;
// `synth` và `Utterance` được tiêm vào nên kiểm thử được bằng `node --test`.
//
// BR05: chỉ dùng giọng có mã ngôn ngữ khớp bài đang nghe. Không có giọng hoặc không phát được thì
//       báo lý do, KHÔNG đọc bằng giọng sai ngôn ngữ; văn bản bài vẫn hiển thị cho khách đọc.
// UC03-E2: nếu trình duyệt không tạm dừng được thì dừng hẳn và để khách bấm Phát lại.

export const TTS_ERRORS = Object.freeze({
  UNSUPPORTED: 'UNSUPPORTED',
  NO_VOICE: 'NO_VOICE',
  TTS_ERROR: 'TTS_ERROR',
  EMPTY_TEXT: 'EMPTY_TEXT',
  PAUSE_UNSUPPORTED: 'PAUSE_UNSUPPORTED',
});

const IDLE = Object.freeze({ status: 'idle', errorCode: null, locale: null, key: null });

const normTag = (tag) => String(tag ?? '').replace('_', '-').toLowerCase();

/** 'vi' khớp 'vi-VN', 'vi_VN', 'vi'; không khớp 'vie-VN'. */
export function voiceMatchesLocale(voice, locale) {
  const tag = normTag(voice?.lang);
  const want = String(locale ?? '').toLowerCase();
  return tag === want || tag.startsWith(`${want}-`);
}

const DEFAULT_TAG = { vi: 'vi-vn', en: 'en-us' };

/** Giọng tốt nhất cho ngôn ngữ, hoặc null nếu không có giọng đúng ngôn ngữ. */
export function pickVoice(voices, locale) {
  const matches = (voices ?? []).filter((v) => voiceMatchesLocale(v, locale));
  if (matches.length === 0) return null;
  const score = (v) => (normTag(v.lang) === (DEFAULT_TAG[locale] ?? locale) ? 2 : 0) + (v.default ? 1 : 0);
  return [...matches].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Chia văn bản thành đoạn ngắn. Chrome tự dừng khi một câu đọc quá lâu (~15 giây), nên đọc từng đoạn
 * ngắn nối tiếp nhau. Ưu tiên cắt ở cuối câu, rồi đến khoảng trắng.
 */
export function splitIntoChunks(text, max = 180) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks = [];
  let rest = clean;
  while (rest.length > max) {
    const win = rest.slice(0, max);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '), win.lastIndexOf('; '));
    if (cut < max * 0.4) cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf(' '));
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export class WebSpeechPlayer {
  constructor({ synth, Utterance, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout, voicesWaitMs = 1500, startTimeoutMs = 5000, maxChunk = 180 }) {
    this.synth = synth ?? null;
    this.Utterance = Utterance ?? null;
    this._setTimeout = (fn, ms) => setTimeoutFn(fn, ms);
    this._clearTimeout = (id) => clearTimeoutFn(id);
    this.voicesWaitMs = voicesWaitMs;
    this.startTimeoutMs = startTimeoutMs;
    this.maxChunk = maxChunk;
    this.state = { ...IDLE };
    this.listeners = new Set();
    this._token = 0;
  }

  get isSupported() {
    return Boolean(this.synth && this.Utterance);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _set(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  _fail(token, code, locale, key) {
    if (token === this._token) this._set({ status: 'error', errorCode: code, locale, key });
    return false;
  }

  /** Danh sách giọng thường nạp bất đồng bộ trên Chrome: chờ `voiceschanged` tối đa voicesWaitMs. */
  async _loadVoices() {
    const first = this.synth.getVoices?.() ?? [];
    if (first.length > 0) return first;
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this._clearTimeout(timer);
        this.synth.removeEventListener?.('voiceschanged', finish);
        resolve();
      };
      const timer = this._setTimeout(finish, this.voicesWaitMs);
      this.synth.addEventListener?.('voiceschanged', finish);
    });
    return this.synth.getVoices?.() ?? [];
  }

  /**
   * Phát một bài. Phải gọi từ thao tác bấm của khách (chính sách tự phát của trình duyệt).
   * Trả true khi đã bắt đầu đọc; false khi lỗi (state.status = 'error' kèm errorCode).
   */
  async play({ text, locale, key = null }) {
    this.stop({ silent: true });
    const token = ++this._token;
    if (!this.isSupported) return this._fail(token, TTS_ERRORS.UNSUPPORTED, locale, key);
    const chunks = splitIntoChunks(text, this.maxChunk);
    if (chunks.length === 0) return this._fail(token, TTS_ERRORS.EMPTY_TEXT, locale, key);

    this._set({ status: 'loading', errorCode: null, locale, key });
    let voice;
    try { voice = pickVoice(await this._loadVoices(), locale); }
    catch { return this._fail(token, TTS_ERRORS.TTS_ERROR, locale, key); }
    if (token !== this._token) return false; // khách đã dừng hoặc đổi bài trong lúc chờ
    if (!voice) return this._fail(token, TTS_ERRORS.NO_VOICE, locale, key);

    return new Promise((resolve) => {
      let started = false;
      let settled = false;
      const settle = (ok) => {
        if (settled) return;
        settled = true;
        if (this._cancelPending === cancelPending) this._cancelPending = null;
        resolve(ok);
      };
      const cancelPending = () => settle(false);
      this._cancelPending = cancelPending;
      const fail = (code) => {
        if (token !== this._token) return settle(false);
        this._clearTimeout(this._watchdog);
        this._fail(token, code, locale, key);
        this._token++; // invalidate callbacks before cancel can fire events
        try { this.synth.cancel(); } catch { /* bỏ qua */ }
        settle(false);
      };

      const speak = (i) => {
        if (token !== this._token) return settle(false);
        this._clearTimeout(this._watchdog);
        this._watchdog = this._setTimeout(() => fail(TTS_ERRORS.TTS_ERROR), this.startTimeoutMs);
        let u;
        try { u = new this.Utterance(chunks[i]); }
        catch { fail(TTS_ERRORS.TTS_ERROR); return; }
        u.voice = voice;
        u.lang = voice.lang;
        u.onstart = () => {
          if (token !== this._token) return;
          this._clearTimeout(this._watchdog);
          if (started) return;
          started = true;
          this._set({ status: 'playing' });
          settle(true);
        };
        u.onend = () => {
          if (token !== this._token) return;
          this._clearTimeout(this._watchdog);
          if (i + 1 < chunks.length) speak(i + 1);
          else { this._set({ ...IDLE }); settle(started); }
        };
        u.onerror = (e) => {
          if (token !== this._token) return;
          // Our own cancel has already invalidated token; a current interruption is a failure.
          fail(TTS_ERRORS.TTS_ERROR);
        };
        try {
          this.synth.speak(u);
        } catch {
          fail(TTS_ERRORS.TTS_ERROR);
        }
      };
      speak(0);
    });
  }

  /** Tạm dừng. Nếu trình duyệt không hỗ trợ thì dừng hẳn và báo để khách Phát lại (UC03-E2). */
  pause() {
    if (this.state.status !== 'playing') return false;
    try { this.synth.pause(); } catch { /* kiểm tra bên dưới */ }
    if (this.synth.paused) {
      this._set({ status: 'paused' });
      return true;
    }
    const { locale, key } = this.state;
    this._token++;
    try { this.synth.cancel(); } catch { /* bỏ qua */ }
    this._set({ status: 'error', errorCode: TTS_ERRORS.PAUSE_UNSUPPORTED, locale, key });
    return false;
  }

  resume() {
    if (this.state.status !== 'paused') return false;
    try {
      this.synth.resume();
      if (this.synth.paused) throw new Error('Still paused');
    } catch {
      const { locale, key } = this.state;
      this.stop({ silent: true });
      this._set({ status: 'error', errorCode: TTS_ERRORS.PAUSE_UNSUPPORTED, locale, key });
      return false;
    }
    this._set({ status: 'playing' });
    return true;
  }

  stop({ silent = false } = {}) {
    this._token++;
    this._clearTimeout(this._watchdog);
    this._cancelPending?.();
    try { this.synth?.cancel?.(); } catch { /* bỏ qua */ }
    if (!silent) this._set({ ...IDLE });
  }
}
