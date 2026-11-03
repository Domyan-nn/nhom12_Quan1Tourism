import { useEffect } from 'react';
import useTts from '../tts/useTts.js';
import { TTS_ERRORS } from '../tts/webSpeechPlayer.js';

const ERROR_KEY = {
  [TTS_ERRORS.UNSUPPORTED]: 'ttsUnsupported',
  [TTS_ERRORS.NO_VOICE]: 'ttsNoVoice',
  [TTS_ERRORS.TTS_ERROR]: 'ttsError',
  [TTS_ERRORS.EMPTY_TEXT]: 'ttsEmpty',
  [TTS_ERRORS.PAUSE_UNSUPPORTED]: 'ttsPauseUnsupported',
};

// UC03: Nghe / Tạm dừng / Tiếp tục / Dừng. Văn bản bài luôn hiển thị ở trang cha, nên khi TTS lỗi
// (BR05) khách vẫn đọc được nội dung.
export default function TtsControls({ t, poiId, locale, localeName, title, body }) {
  const { player, state } = useTts();
  const key = `${poiId}:${locale}`;
  const mine = state.key === key;
  const status = mine ? state.status : 'idle';

  // Đổi địa điểm/ngôn ngữ hoặc rời trang thì dừng đọc.
  useEffect(() => () => player.stop(), [player, key]);

  const play = () => player.play({ text: `${title}. ${body}`, locale, key });
  const message = mine && status === 'error' ? t[ERROR_KEY[state.errorCode]]?.replace('{lang}', localeName) : null;

  return (
    <div className="tts">
      <div className="tts-buttons">
        {(status === 'idle' || status === 'error') && (
          <button className="btn" onClick={play} disabled={!player.isSupported}>
            {status === 'error' ? t.replay : t.listen}
          </button>
        )}
        {status === 'loading' && <button className="btn" disabled>{t.ttsLoading}</button>}
        {status === 'playing' && <button className="btn secondary" onClick={() => player.pause()}>{t.pause}</button>}
        {status === 'paused' && <button className="btn" onClick={() => player.resume()}>{t.resume}</button>}
        {(status === 'playing' || status === 'paused' || status === 'loading') && (
          <button className="btn secondary" onClick={() => player.stop()}>{t.stop}</button>
        )}
      </div>
      <p className={message ? 'tts-alert' : 'muted'} role={message ? 'alert' : 'status'}>
        {message || (!player.isSupported ? t.ttsUnsupported : status === 'playing' ? t.ttsPlaying : '')}
      </p>
    </div>
  );
}
