// Bộ máy quyết định tự phát thuyết minh theo BR07/BR08 (UC04).
// Hàm thuần/được tiêm thời gian nên kiểm thử được mà không cần thiết bị.
// BR07: engine chỉ giữ trạng thái trong bộ nhớ, KHÔNG lưu và KHÔNG gửi tọa độ ở đâu cả.

import { exitRadiusFor, haversineMeters, hasValidCoords, maxAccuracyFor } from './geo';

export const RULES = Object.freeze({
  MAX_SAMPLE_AGE_MS: 15_000, // mẫu không cũ quá 15 giây
  MAX_FUTURE_MS: 1_000, // không vượt thời gian hiện tại quá 1 giây
  DWELL_MS: 5_000, // ở trong vùng liên tục >= 5 giây
  COOLDOWN_MS: 600_000, // vào lại sau >= 600 giây kể từ lần phát thành công
  MAX_GAP_MS: 15_000, // khe hở giữa hai mẫu hợp lệ làm mất tính "liên tục"
});

/** Mẫu hợp lệ cho một POI cụ thể (BR08). */
export function isSampleValidForPoi(sample, poi, now) {
  if (!sample || !Number.isFinite(sample.timestamp)) return false;
  if (now - sample.timestamp > RULES.MAX_SAMPLE_AGE_MS) return false;
  if (sample.timestamp - now > RULES.MAX_FUTURE_MS) return false;
  // Thiết bị không báo sai số thì không thể xác minh -> bỏ mẫu.
  if (!Number.isFinite(sample.accuracy)) return false;
  return sample.accuracy <= maxAccuracyFor(poi.radius_m);
}

export function poiHasNarration(poi, locale) {
  if (Array.isArray(poi.narrations)) {
    return poi.narrations.some(
      (n) => n.locale === locale && String(n.body ?? '').trim() && String(n.title ?? '').trim()
    );
  }
  return Array.isArray(poi.narration_locales) && poi.narration_locales.includes(locale);
}

const isPublic = (poi) => poi.status === undefined || poi.status === 'published';

export class AutoPlayEngine {
  constructor() {
    this.states = new Map();
  }

  reset() {
    this.states.clear();
  }

  _state(id) {
    let st = this.states.get(id);
    if (!st) {
      st = { insideSince: null, lastValidAt: null, lastPlayedAt: null, exitedSincePlay: false };
      this.states.set(id, st);
    }
    return st;
  }

  /** Ghi nhận lần phát THÀNH CÔNG (TTS đã bắt đầu). Phát lỗi thì không gọi hàm này (UC04-E2). */
  recordPlaySuccess(poiId, at) {
    const st = this._state(poiId);
    st.lastPlayedAt = at;
    st.exitedSincePlay = false;
  }

  /**
   * Xử lý một mẫu GPS.
   * @returns {{candidate: object|null, reason: string, distances: Record<string, number>}}
   */
  evaluate({ sample, pois, locale, now, isPlaying = false }) {
    const distances = {};
    const eligible = [];

    for (const poi of pois) {
      if (!hasValidCoords(poi) || !isPublic(poi)) continue;
      if (!isSampleValidForPoi(sample, poi, now)) continue; // bỏ mẫu cho POI này

      const st = this._state(poi.id);
      if (st.lastValidAt !== null && sample.timestamp < st.lastValidAt) continue; // mẫu đến trễ/ngược thời gian

      const d = haversineMeters(sample.latitude, sample.longitude, poi.latitude, poi.longitude);
      distances[poi.id] = d;

      // Khe hở quá dài giữa hai mẫu hợp lệ -> không còn "liên tục".
      if (st.lastValidAt !== null && sample.timestamp - st.lastValidAt > RULES.MAX_GAP_MS) {
        st.insideSince = null;
      }

      if (d > exitRadiusFor(poi.radius_m)) {
        st.insideSince = null;
        if (st.lastPlayedAt !== null) st.exitedSincePlay = true;
      } else if (d <= poi.radius_m && st.insideSince === null) {
        st.insideSince = sample.timestamp;
      }
      // Giữa bán kính và ngưỡng ra vùng: giữ nguyên trạng thái (chống nhấp nháy).
      st.lastValidAt = sample.timestamp;

      if (st.insideSince === null) continue;
      if (sample.timestamp - st.insideSince < RULES.DWELL_MS) continue;
      if (!poiHasNarration(poi, locale)) continue;
      if (st.lastPlayedAt !== null) {
        const reentered = st.exitedSincePlay && st.insideSince - st.lastPlayedAt >= RULES.COOLDOWN_MS;
        if (!reentered) continue;
      }
      eligible.push({ poi, d });
    }

    if (eligible.length === 0) return { candidate: null, reason: 'NO_ELIGIBLE_POI', distances };
    if (isPlaying) return { candidate: null, reason: 'ALREADY_PLAYING', distances };

    eligible.sort((a, b) => a.d - b.d || (a.poi.id < b.poi.id ? -1 : a.poi.id > b.poi.id ? 1 : 0));
    return { candidate: eligible[0].poi, reason: 'OK', distances };
  }
}
