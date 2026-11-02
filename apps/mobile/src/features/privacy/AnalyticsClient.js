// UC12: đồng ý / rút đồng ý thống kê ẩn danh + heartbeat (BR13–BR15, BR18).
// Không phụ thuộc React Native: storage, api, timer được tiêm vào để kiểm thử.
//
// Quy tắc cốt lõi:
//  - Chưa đồng ý hoặc từ chối: KHÔNG tạo mã phiên, KHÔNG gọi API nào (BR13).
//  - Heartbeat mỗi 30 giây khi ứng dụng hiển thị và có mạng; dừng khi ẩn/mất mạng (BR15).
//  - Rút đồng ý: dừng gửi NGAY, giữ mã chỉ để gửi lại yêu cầu rút nếu thất bại (UC12-E1).

const KEYS = {
  consent: 'saigon.consent.v1', // 'granted' | 'denied' | (không có = chưa chọn)
  sessionId: 'saigon.analytics.session_id',
  pendingRevoke: 'saigon.analytics.pending_revoke',
};

export class AnalyticsClient {
  constructor({ storage, api, randomId, intervalMs = 30_000, setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
    this.storage = storage;
    this.api = api;
    this.randomId = randomId;
    this.intervalMs = intervalMs;
    this._setInterval = setIntervalFn;
    this._clearInterval = clearIntervalFn;
    this.consent = null; // null | 'granted' | 'denied'
    this.sessionId = null;
    this.pendingRevoke = null;
    this.running = false; // hiển thị && có mạng
    this._timer = null;
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot() {
    return { consent: this.consent, hasPendingRevoke: this.pendingRevoke !== null };
  }

  _emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
  }

  async init() {
    const [consent, sessionId, pending] = await Promise.all([
      this.storage.getItem(KEYS.consent),
      this.storage.getItem(KEYS.sessionId),
      this.storage.getItem(KEYS.pendingRevoke),
    ]);
    this.consent = consent === 'granted' || consent === 'denied' ? consent : null;
    this.sessionId = this.consent === 'granted' ? sessionId : null;
    this.pendingRevoke = pending || null;
    this._emit();
  }

  /** Khách chọn Đồng ý: lưu lựa chọn, tạo mã ngẫu nhiên nếu cần (UC12 bước 4). */
  async grant() {
    this.consent = 'granted';
    if (!this.sessionId) this.sessionId = this.randomId();
    await this.storage.setItem(KEYS.consent, 'granted');
    await this.storage.setItem(KEYS.sessionId, this.sessionId);
    this._emit();
    this._syncTimer();
  }

  /** Khách chọn Từ chối: lưu ở thiết bị, không tạo mã, không gửi gì (UC12-A1). */
  async decline() {
    this._stopTimer();
    this.consent = 'denied';
    this.sessionId = null;
    await this.storage.setItem(KEYS.consent, 'denied');
    this._emit();
  }

  /** Rút đồng ý (UC12-A2): dừng gửi ngay, rồi yêu cầu server loại phiên. */
  async revoke() {
    this._stopTimer(); // dừng NGAY, trước mọi thao tác bất đồng bộ
    const id = this.sessionId ?? this.pendingRevoke;
    this.consent = 'denied';
    this.sessionId = null;
    if (id) this.pendingRevoke = id;
    this._emit();
    await this.storage.setItem(KEYS.consent, 'denied');
    await this.storage.removeItem(KEYS.sessionId);
    if (id) await this.storage.setItem(KEYS.pendingRevoke, id);
    return this.flushRevoke();
  }

  /** Gửi (lại) yêu cầu rút. Chỉ xóa mã khi server trả 204 (UC12-E1). */
  async flushRevoke() {
    if (!this.pendingRevoke) return true;
    const id = this.pendingRevoke;
    try {
      await this.api.revoke(id);
    } catch {
      return false; // giữ mã, thử lại khi có mạng và ứng dụng đang mở
    }
    if (this.pendingRevoke === id) {
      this.pendingRevoke = null;
      await this.storage.removeItem(KEYS.pendingRevoke);
      this._emit();
    }
    return true;
  }

  /** Gọi khi (ứng dụng đang hiển thị && có mạng) thay đổi. */
  setRunning(running) {
    this.running = running;
    if (running) this.flushRevoke();
    this._syncTimer();
  }

  _syncTimer() {
    if (this.running && this.consent === 'granted' && this.sessionId) {
      if (!this._timer) {
        this.sendHeartbeat();
        this._timer = this._setInterval(() => this.sendHeartbeat(), this.intervalMs);
      }
    } else {
      this._stopTimer();
    }
  }

  _stopTimer() {
    if (this._timer) {
      this._clearInterval(this._timer);
      this._timer = null;
    }
  }

  async sendHeartbeat() {
    if (this.consent !== 'granted' || !this.sessionId) return false;
    const id = this.sessionId;
    try {
      await this.api.heartbeat(id);
      return true;
    } catch (err) {
      if (err?.code === 'SESSION_REVOKED' || err?.status === 409) {
        // Server báo phiên đã rút: dừng gửi và xóa mã (API_CONTRACT 5.1).
        this._stopTimer();
        if (this.sessionId === id) {
          this.sessionId = null;
          this.consent = 'denied';
          await this.storage.removeItem(KEYS.sessionId);
          await this.storage.setItem(KEYS.consent, 'denied');
          this._emit();
        }
      }
      return false; // lỗi khác (mất mạng...) bỏ qua; nhịp sau thử lại
    }
  }
}

export { KEYS as ANALYTICS_STORAGE_KEYS };
