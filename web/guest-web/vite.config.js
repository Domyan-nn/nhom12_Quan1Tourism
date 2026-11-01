import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// guest-web chạy ở cổng 5173; /api được chuyển tiếp tới saigon-api (FastAPI, cổng 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
});
