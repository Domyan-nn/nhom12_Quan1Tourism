import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Mặc định dùng dữ liệu giả lập, giống guest-web. Đặt EXPO_PUBLIC_USE_MOCK=false để gọi API thật. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/** 'v1' = backend hiện tại; 'contract' = docs/API_CONTRACT.md (/public/...). */
export const API_STYLE = process.env.EXPO_PUBLIC_API_STYLE === 'contract' ? 'contract' : 'v1';

function detectApiBase() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  // Khi chạy bằng Expo Go, hostUri là "<IP LAN máy dev>:8081": dùng lại IP đó cho backend (cổng 8000).
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return `http://${hostUri.split(':')[0]}:8000/api`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
}

export const API_BASE_URL = detectApiBase();
/** Gốc máy chủ (bỏ hậu tố /api) để ghép đường dẫn ảnh /media/... */
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
