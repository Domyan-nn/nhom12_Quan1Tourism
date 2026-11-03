import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// guest-web chạy ở cổng 5173; /api được chuyển tiếp tới saigon-api (FastAPI, cổng 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
