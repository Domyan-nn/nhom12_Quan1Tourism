// Browser engine fixture only: these tests never claim audible speech.
export async function installSpeech(page, { languages = ['vi-VN', 'en-US'], canPause = true, mode = 'hold' } = {}) {
  await page.addInitScript(({ languages, canPause, mode }) => {
    const listeners = new Set();
    const state = window.__speech = { spoken: [], cancelled: 0, active: null, mode };
    let voices = languages.map((lang) => ({ lang, name: lang }));
    const synth = {
      paused: false,
      getVoices: () => voices,
      addEventListener: (_, fn) => listeners.add(fn),
      removeEventListener: (_, fn) => listeners.delete(fn),
      speak(u) {
        state.spoken.push({ text: u.text, lang: u.lang, voice: u.voice.name });
        state.active = u;
        queueMicrotask(() => {
          if (state.active !== u) return;
          if (state.mode === 'error') u.onerror({ error: 'synthesis-failed' });
          else u.onstart();
        });
      },
      cancel() { state.active = null; state.cancelled++; synth.paused = false; },
      pause() { if (canPause) synth.paused = true; },
      resume() { synth.paused = false; },
    };
    state.setLanguages = (languages) => {
      voices = languages.map((lang) => ({ lang, name: lang }));
      listeners.forEach((fn) => fn());
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class { constructor(text) { this.text = text; } }, configurable: true,
    });
  }, { languages, canPause, mode });
}
