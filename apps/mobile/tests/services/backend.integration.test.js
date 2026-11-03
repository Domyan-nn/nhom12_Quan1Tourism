/** @jest-environment node */
import { createApiClient } from '../../src/services/apiClient';
import { createPublicApi } from '../../src/services/publicApi';
import http from 'node:http';
import { getMapMarkers } from '../../src/features/map/mapMarkers';

// jest-expo replaces fetch; use actual HTTP for these opt-in integration tests.
const fetchImpl = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: async () => JSON.parse(body) }));
  }).on('error', reject);
});

const run = process.env.SAIGON_TEST_API_URL ? test : test.skip;
run('real FastAPI category, list, detail and missing place contract', async () => {
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

const gate2 = process.env.SAIGON_TEST_API_URL && process.env.SAIGON_TEST_FIXTURE === 'gate2' ? test : test.skip;
gate2('Gate 2 disposable fixture: published markers, NFC search, combined category and private details', async () => {
  const client = createApiClient({ baseUrl: process.env.SAIGON_TEST_API_URL, fetchImpl });
  const api = createPublicApi({ client, useMock: false });
  const places = await api.listPois();
  expect(places.map((p) => p.id).sort()).toEqual(['market', 'palace']);
  expect(getMapMarkers(places)).toHaveLength(2);
  expect((await api.listPois({ q: '  ĐỘC LẬP  '.normalize('NFD'), categoryId: 'history' })).map((p) => p.id)).toEqual(['palace']);
  expect(await api.listPois({ q: 'Độc Lập', categoryId: 'culture' })).toEqual([]);
  for (const id of ['draft', 'hidden', 'missing']) await expect(api.getPoi(id)).rejects.toMatchObject({ status: 404 });
  expect((await api.getPoi('palace')).narrations.map((n) => n.locale)).toEqual(['en', 'fr', 'vi']);
});
