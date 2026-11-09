"""Giới hạn đăng nhập sai cho Admin (NFR01, BR10): chống dò mật khẩu.

Đếm theo tên đăng nhập đã chuẩn hóa, trong bộ nhớ của tiến trình API (đồ án chạy một tiến trình
uvicorn; khởi động lại API thì bộ đếm về 0). Không đếm theo IP vì Admin đi qua Vite proxy nên mọi
trình duyệt đều đến từ 127.0.0.1. Tên không tồn tại cũng bị đếm để không lộ tài khoản nào có thật.
"""

import math
import threading
from collections import deque
from datetime import datetime, timedelta

MAX_FAILURES = 5
WINDOW = timedelta(minutes=15)
MAX_TRACKED_NAMES = 10_000


class LoginThrottle:
    def __init__(self, max_failures: int = MAX_FAILURES, window: timedelta = WINDOW):
        self.max_failures = max_failures
        self.window = window
        self._failures: dict[str, deque[datetime]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: datetime) -> deque[datetime] | None:
        failures = self._failures.get(key)
        while failures and now - failures[0] >= self.window:
            failures.popleft()
        if failures is not None and not failures:
            del self._failures[key]
            return None
        return failures

    def retry_after(self, key: str, now: datetime) -> int:
        """Số giây phải chờ trước lần thử tiếp theo; 0 nếu được thử ngay."""
        with self._lock:
            failures = self._recent(key, now)
            if failures is None or len(failures) < self.max_failures:
                return 0
            return max(1, math.ceil((failures[0] + self.window - now).total_seconds()))

    def record_failure(self, key: str, now: datetime) -> None:
        with self._lock:
            if len(self._failures) >= MAX_TRACKED_NAMES:
                for name in list(self._failures):
                    self._recent(name, now)
            self._recent(key, now)
            self._failures.setdefault(key, deque()).append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()
