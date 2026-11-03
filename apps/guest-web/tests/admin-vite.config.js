export default {
  cacheDir: 'node_modules/.vite-admin-test',
  server: { proxy: { '/api': 'http://127.0.0.1:18082' } },
};
