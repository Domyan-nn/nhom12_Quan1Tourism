import { useEffect, useSyncExternalStore } from 'react';
import {
  getConsent, subscribe, initAnalytics,
  grantConsent, declineConsent, withdrawConsent, hasPendingRevoke,
} from './analyticsClient';

// Dùng một lần ở gốc ứng dụng để khởi động heartbeat; mọi nơi khác chỉ đọc trạng thái.
export function useAnalyticsConsent() {
  useEffect(() => initAnalytics(), []);
  const consent = useSyncExternalStore(subscribe, getConsent, () => 'unset');
  const pendingRevoke = useSyncExternalStore(subscribe, hasPendingRevoke, () => false);
  return { consent, pendingRevoke, grant: grantConsent, decline: declineConsent, withdraw: withdrawConsent };
}
