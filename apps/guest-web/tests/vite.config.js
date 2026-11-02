import { mergeConfig } from 'vite';
import os from 'node:os';
import path from 'node:path';
import config from '../vite.config.js';

export default mergeConfig(config, {
  cacheDir: path.join(os.tmpdir(), `saigon-vite-test-${process.env.VITE_USE_MOCK}`),
  server: { proxy: { '/api': 'http://127.0.0.1:18082' } },
});
