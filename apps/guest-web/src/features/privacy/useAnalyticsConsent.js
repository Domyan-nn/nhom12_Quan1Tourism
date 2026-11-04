import { useSyncExternalStore } from 'react';
import {
  getConsent, subscribe, getConsentError,
  grantConsent, declineConsent, withdrawConsent, hasPendingRevoke,
} from './analyticsClient';

// AppLayout owns the analytics lifecycle; controls only subscribe.
export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, getConsent, () => 'unset');
  const pendingRevoke = useSyncExternalStore(subscribe, hasPendingRevoke, () => false);
  const error = useSyncExternalStore(subscribe, getConsentError, () => null);
  return { consent, pendingRevoke, error, grant: grantConsent, decline: declineConsent, withdraw: withdrawConsent };
}
