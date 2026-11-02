import { defineConfig } from '@playwright/test';
import path from 'node:path';

const root = process.env.SAIGON_TEST_ROOT || path.resolve('../..');
const python = process.env.SAIGON_TEST_PYTHON || path.join(root, '.venv', 'Scripts', 'python.exe');
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.js', workers: 1,
  use: { channel: 'msedge', headless: true },
  webServer: [
    { command: `"${python}" -u tests/serve_api.py`, url: 'http://127.0.0.1:18082/api/v1/health',
      env: { SAIGON_TEST_ROOT: root }, reuseExistingServer: false },
    ...[['true', 18173], ['false', 18174]].map(([mock, port]) => ({
      command: `npm run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port ${port} --strictPort`,
      url: `http://127.0.0.1:${port}`, env: { VITE_USE_MOCK: mock, VITE_API_BASE_URL: '/api/v1' },
      reuseExistingServer: false,
    })),
  ],
});
