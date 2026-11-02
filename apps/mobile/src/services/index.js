import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_STYLE, SERVER_ORIGIN, USE_MOCK } from '../config';
import { createAnalyticsApi } from './analyticsApi';
import { createApiClient } from './apiClient';
import { createPublicApi } from './publicApi';

const client = createApiClient({ baseUrl: API_BASE_URL });

export const publicApi = createPublicApi({ client, useMock: USE_MOCK, style: API_STYLE });
export const analyticsApi = createAnalyticsApi({ client, useMock: USE_MOCK });
export const storage = AsyncStorage;
export { USE_MOCK };

/** Ghép đường dẫn ảnh tương đối (/media/...) với địa chỉ máy chủ. */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
