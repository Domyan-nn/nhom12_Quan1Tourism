import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.SAIGON_TEST_ROOT || path.resolve(appDir, '../..');
const python = process.env.SAIGON_TEST_PYTHON || path.join(root, '.venv', 'Scripts', 'python.exe');
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.js', workers: 1,
  use: { channel: 'msedge', headless: true },
  webServer: [
    { command: `"${python}" -u tests/serve_api.py`, url: 'http://127.0.0.1:18082/api/v1/health',
      cwd: appDir, env: { SAIGON_TEST_ROOT: root, SAIGON_TEST_HOST: '127.0.0.1', SAIGON_TEST_PORT: '18082' }, reuseExistingServer: false },
    ...[['true', 18173], ['false', 18174]].map(([mock, port]) => ({
      command: `npm run dev -- --config tests/vite.config.js --configLoader runner --host 127.0.0.1 --port ${port} --strictPort`,
      cwd: appDir,
      url: `http://127.0.0.1:${port}`, env: { VITE_USE_MOCK: mock, VITE_API_BASE_URL: '/api/v1' },
      reuseExistingServer: false,
    })),
    { command: `node node_modules/vite/bin/vite.js --config ../guest-web/tests/admin-vite.config.js --configLoader runner --host 127.0.0.1 --port 18175 --strictPort`,
      cwd: path.resolve(appDir, '../admin-web'), url: 'http://127.0.0.1:18175', reuseExistingServer: false },
  ],
});
