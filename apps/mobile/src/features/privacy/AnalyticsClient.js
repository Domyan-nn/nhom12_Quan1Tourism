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
  constructor({ storage, api, randomId, enabled = true, intervalMs = 30_000, setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
    this.storage = storage;
    this.api = api;
    this.randomId = randomId;
    this.enabled = enabled;
    this.intervalMs = intervalMs;
    this._setInterval = setIntervalFn;
    this._clearInterval = clearIntervalFn;
    this.consent = null; // null | 'granted' | 'denied'
    this.sessionId = null;
    this.pendingRevoke = null;
    this.running = false; // hiển thị && có mạng
    this.storageError = false;
    this._persisted = false;
    this._version = 0;
    this._writes = Promise.resolve();
    this._heartbeatPending = false;
    this._revokePending = null;
    this._timer = null;
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot() {
    return { consent: this.consent, hasPendingRevoke: this.pendingRevoke !== null, storageError: this.storageError };
  }

  _emit() {
    const s = this.snapshot();
    this.listeners.forEach((fn) => fn(s));
  }

  async init() {
    try {
      const [consent, sessionId, pending] = await Promise.all([
        this.storage.getItem(KEYS.consent),
        this.storage.getItem(KEYS.sessionId),
        this.storage.getItem(KEYS.pendingRevoke),
      ]);
      this.pendingRevoke = pending || null;
      // Khôi phục cả khi ứng dụng bị đóng giữa lúc ghi yêu cầu rút.
      this.consent = pending ? 'denied' : consent === 'granted' || consent === 'denied' ? consent : null;
      this.sessionId = this.consent === 'granted' ? sessionId : null;
      // Dữ liệu cũ/ghi dở không có mã: yêu cầu lựa chọn lại, không báo đang thống kê.
      if (this.consent === 'granted' && !this.sessionId) this.consent = null;
      this._persisted = true;
    } catch { this._storageFailed(); }
    this._emit();
  }

  _write(action) {
    const result = this._writes.then(action);
    this._writes = result.catch(() => {});
    return result;
  }

  _storageFailed() {
    this.storageError = true;
    this._persisted = false;
    this._stopTimer();
    this._emit();
    return false;
  }

  /** Khách chọn Đồng ý: lưu lựa chọn, tạo mã ngẫu nhiên nếu cần (UC12 bước 4). */
  async grant() {
    if (!this.enabled || this.storageError || this.pendingRevoke) return false;
    if (this.consent === 'granted') return this._persisted;
    const version = ++this._version;
    this.consent = 'granted';
    if (!this.sessionId) this.sessionId = this.randomId();
    const id = this.sessionId;
    this._persisted = false;
    try {
      await this._write(async () => {
        await this.storage.setItem(KEYS.sessionId, id);
        await this.storage.setItem(KEYS.consent, 'granted');
      });
    } catch {
      // Chỉ hoàn tác lần đồng ý này; không ghi đè thao tác rút đã xảy ra trong lúc chờ lưu.
      if (version === this._version) {
        this.consent = null;
        this.sessionId = null;
      }
      return this._storageFailed();
    }
    if (version !== this._version) return false;
    this._persisted = true;
    this._emit();
    this._syncTimer();
    return true;
  }

  /** Khách chọn Từ chối: lưu ở thiết bị, không tạo mã, không gửi gì (UC12-A1). */
  async decline() {
    if (this.sessionId || this.pendingRevoke) return this.revoke();
    ++this._version;
    this._stopTimer();
    this.consent = 'denied';
    this.sessionId = null;
    try { await this._write(() => this.storage.setItem(KEYS.consent, 'denied')); }
    catch { return this._storageFailed(); }
    this._emit();
    return true;
  }

  /** Rút đồng ý (UC12-A2): dừng gửi ngay, rồi yêu cầu server loại phiên. */
  async revoke() {
    this._stopTimer(); // dừng NGAY, trước mọi thao tác bất đồng bộ
    ++this._version;
    const id = this.sessionId ?? this.pendingRevoke;
    this.consent = 'denied';
    this.sessionId = null;
    if (id) this.pendingRevoke = id;
    this._emit();
    try {
      await this._write(async () => {
        // Ghi mã cần rút trước khi xóa mã đang dùng để không mất yêu cầu khi đóng ứng dụng.
        if (id) await this.storage.setItem(KEYS.pendingRevoke, id);
        await this.storage.setItem(KEYS.consent, 'denied');
        await this.storage.removeItem(KEYS.sessionId);
      });
    } catch { return this._storageFailed(); }
    const result = await this.flushRevoke();
    this._syncTimer();
    return result;
  }

  /** Gửi (lại) yêu cầu rút. Chỉ xóa mã khi server trả 204 (UC12-E1). */
  flushRevoke() {
    if (!this.pendingRevoke) return Promise.resolve(true);
    if (!this.enabled) return Promise.resolve(false);
    if (this._revokePending) return this._revokePending;
    if (this.storageError) return Promise.resolve(false);
    const id = this.pendingRevoke;
    this._revokePending = (async () => {
      try { await this.api.revoke(id); }
      catch { return false; }
      try {
        await this._write(async () => {
          await this.storage.setItem(KEYS.consent, 'denied');
          await this.storage.removeItem(KEYS.sessionId);
          await this.storage.removeItem(KEYS.pendingRevoke);
        });
      } catch { return this._storageFailed(); }
      if (this.pendingRevoke === id) {
        this.pendingRevoke = null;
        this._emit();
        this._syncTimer();
      }
      return true;
    })().finally(() => { this._revokePending = null; });
    return this._revokePending;
  }

  /** Gọi khi (ứng dụng đang hiển thị && có mạng) thay đổi. */
  setRunning(running) {
    this.running = running && this.enabled;
    if (this.running && this.pendingRevoke) this.flushRevoke();
    this._syncTimer();
  }

  _syncTimer() {
    if (this.running && !this.storageError && (this.pendingRevoke || (this._persisted && this.consent === 'granted' && this.sessionId))) {
      if (!this._timer) {
        if (!this.pendingRevoke) this.sendHeartbeat();
        this._timer = this._setInterval(() => {
          if (!this.running) return;
          if (this.pendingRevoke) this.flushRevoke();
          else this.sendHeartbeat();
        }, this.intervalMs);
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
    if (!this.running || !this._persisted || this.storageError || this.pendingRevoke || this._heartbeatPending || this.consent !== 'granted' || !this.sessionId) return false;
    const id = this.sessionId;
    this._heartbeatPending = true;
    try {
      await this.api.heartbeat(id);
      return true;
    } catch (err) {
      if (err?.code === 'SESSION_REVOKED' || err?.status === 409) {
        // Server báo phiên đã rút: dừng gửi và xóa mã (API_CONTRACT 5.1).
        if (this.sessionId === id) {
          this._stopTimer();
          this.sessionId = null;
          this.consent = 'denied';
          try {
            await this._write(async () => {
              await this.storage.setItem(KEYS.consent, 'denied');
              await this.storage.removeItem(KEYS.sessionId);
            });
          } catch { return this._storageFailed(); }
          this._emit();
        }
      }
      return false; // lỗi khác (mất mạng...) bỏ qua; nhịp sau thử lại
    } finally {
      this._heartbeatPending = false;
    }
  }
}

export { KEYS as ANALYTICS_STORAGE_KEYS };
