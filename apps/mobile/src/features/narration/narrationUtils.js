// Hàm thuần cho UC03: chọn bài theo ngôn ngữ, chọn giọng TTS, chia đoạn văn bản dài.

// Cùng danh sách với backend app/core/locales.py (GET /api/v1/locales).
export const SUPPORTED_LOCALES = [
  { code: 'vi', label: 'Tiếng Việt', speechTag: 'vi-VN' },
  { code: 'en', label: 'English', speechTag: 'en-US' },
  { code: 'fr', label: 'Français', speechTag: 'fr-FR' },
  { code: 'zh', label: '中文', speechTag: 'zh-CN' },
  { code: 'ja', label: '日本語', speechTag: 'ja-JP' },
  { code: 'ko', label: '한국어', speechTag: 'ko-KR' },
];

export const localeLabel = (code) => SUPPORTED_LOCALES.find((l) => l.code === code)?.label ?? code;
export const speechTagFor = (code) => SUPPORTED_LOCALES.find((l) => l.code === code)?.speechTag ?? code;

/** Bài thuyết minh đúng ngôn ngữ, có nội dung. KHÔNG tự đổi sang ngôn ngữ khác (BR03, UC03-A1). */
export function getNarration(poi, locale) {
  const n = (poi?.narrations ?? []).find((x) => x.locale === locale);
  if (!n || !String(n.title ?? '').trim() || !String(n.body ?? '').trim()) return null;
  return n;
}

/** Danh sách mã ngôn ngữ có nội dung; 'vi' đứng đầu. */
export function availableLocales(poi) {
  const codes = Array.isArray(poi?.narrations)
    ? poi.narrations.filter((n) => getNarration(poi, n.locale)).map((n) => n.locale)
    : poi?.narration_locales ?? [];
  return [...new Set(codes)].sort((a, b) => (a === 'vi' ? -1 : b === 'vi' ? 1 : a.localeCompare(b)));
}

const normTag = (tag) => String(tag ?? '').replace('_', '-').toLowerCase();

/** Giọng đọc có phù hợp mã ngôn ngữ không ('vi' khớp 'vi-VN', 'vi_VN', 'vi'). */
export function voiceMatchesLocale(voice, locale) {
  const tag = normTag(voice?.language);
  return tag === locale || tag.startsWith(`${locale}-`);
}

/** Chọn giọng tốt nhất cho ngôn ngữ; trả null nếu không có (BR05: không dùng giọng sai ngôn ngữ). */
export function pickVoice(voices, locale) {
  const matches = (voices ?? []).filter((v) => voiceMatchesLocale(v, locale));
  if (matches.length === 0) return null;
  const exact = speechTagFor(locale).toLowerCase();
  const score = (v) =>
    (normTag(v.language) === exact ? 2 : 0) + (String(v.quality ?? '').toLowerCase() === 'enhanced' ? 1 : 0);
  return [...matches].sort((a, b) => score(b) - score(a))[0];
}

/** Chia văn bản thành các đoạn <= max ký tự, ưu tiên cắt ở cuối câu rồi đến khoảng trắng. */
export function splitIntoChunks(text, max = 3500) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks = [];
  let rest = clean;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
    if (cut < max * 0.4) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
