/** @jest-environment node */
import { createApiClient } from '../../src/services/apiClient';
import { createPublicApi } from '../../src/services/publicApi';
import http from 'node:http';

const run = process.env.SAIGON_TEST_API_URL ? test : test.skip;
run('real FastAPI category, list, detail and missing place contract', async () => {
  // jest-expo replaces fetch with a mock; this adapter performs a real HTTP request.
  const fetchImpl = (url) => new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: async () => JSON.parse(body) }));
    }).on('error', reject);
  });
  const client = createApiClient({ baseUrl: process.env.SAIGON_TEST_API_URL, fetchImpl });
  const api = createPublicApi({ client, useMock: false });
  const categories = await api.listCategories();
  expect(categories.length).toBeGreaterThan(0);
  const places = await api.listPois();
  expect(places.length).toBeGreaterThan(0);
  const detail = await api.getPoi(places[0].id);
  expect(Array.isArray(detail.narrations)).toBe(true);
  await expect(api.getPoi('missing')).rejects.toMatchObject({ status: 404 });
});
