/** @jest-environment node */
import { createApiClient } from '../../src/services/apiClient';
import { createPublicApi } from '../../src/services/publicApi';
import { createAnalyticsApi } from '../../src/services/analyticsApi';
import { AnalyticsClient, ANALYTICS_STORAGE_KEYS as K } from '../../src/features/privacy/AnalyticsClient';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { getMapMarkers } from '../../src/features/map/mapMarkers';

// jest-expo replaces fetch; use actual HTTP for these opt-in integration tests.
const fetchImpl = (url, init = {}) => new Promise((resolve, reject) => {
  const request = http.request(url, { method: init.method || 'GET', headers: init.headers, signal: init.signal }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: async () => JSON.parse(body) }));
  }).on('error', reject);
  request.end(init.body);
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

const serverState = async (id) => {
  const origin = process.env.SAIGON_TEST_API_URL.replace(/\/api\/?$/, '');
  const response = await fetchImpl(`${origin}/__test/analytics/${id}`);
  expect(response.status).toBe(200);
  return response.json();
};

gate2('mobile analytics uses real HTTP: consent, one visit, idempotent revoke and late heartbeat rejected', async () => {
  const httpClient = createApiClient({ baseUrl: process.env.SAIGON_TEST_API_URL, fetchImpl });
  const api = createAnalyticsApi({ client: httpClient, useMock: false });
  const id = randomUUID();
  const mem = new Map();
  const storage = { getItem: async (key) => mem.get(key) ?? null, setItem: async (key, value) => void mem.set(key, value), removeItem: async (key) => void mem.delete(key) };
  const randomId = jest.fn(() => id);
  const pendingBeats = [];
  const analytics = new AnalyticsClient({ storage, api: { ...api, heartbeat: (session) => { const request = api.heartbeat(session); pendingBeats.push(request); return request; } }, randomId,
    setIntervalFn: () => 1, clearIntervalFn: () => {} });
  await analytics.init();
  analytics.setRunning(true);
  expect(randomId).not.toHaveBeenCalled();
  expect(await serverState(id)).toMatchObject({ consent: null, linked_visits: 0 });
  await analytics.grant();
  await Promise.all(pendingBeats);
  await analytics.sendHeartbeat();
  expect(await serverState(id)).toMatchObject({ consent: 1, linked_visits: 1 });
  expect(await analytics.revoke()).toBe(true);
  await api.revoke(id);
  expect(await serverState(id)).toMatchObject({ consent: 0, linked_visits: 0 });
  await expect(api.heartbeat(id)).rejects.toMatchObject({ status: 409 });
  expect(mem.has(K.sessionId)).toBe(false);
  expect(mem.has(K.pendingRevoke)).toBe(false);
  analytics.setRunning(false);
});

gate2('mobile analytics retries a simulated failed withdrawal against real HTTP without losing session', async () => {
  const httpClient = createApiClient({ baseUrl: process.env.SAIGON_TEST_API_URL, fetchImpl });
  const api = createAnalyticsApi({ client: httpClient, useMock: false });
  const id = randomUUID();
  const mem = new Map();
  const storage = { getItem: async (key) => mem.get(key) ?? null, setItem: async (key, value) => void mem.set(key, value), removeItem: async (key) => void mem.delete(key) };
  let fail = true;
  const analytics = new AnalyticsClient({ storage, api: { ...api, revoke: (session) => { if (fail) throw new Error('simulated offline'); return api.revoke(session); } }, randomId: () => id });
  await analytics.init();
  await analytics.grant();
  await api.heartbeat(id);
  expect(await analytics.revoke()).toBe(false);
  expect(await analytics.grant()).toBe(false);
  expect(mem.get(K.pendingRevoke)).toBe(id);
  expect(await serverState(id)).toMatchObject({ consent: 1, linked_visits: 1 });
  fail = false;
  expect(await analytics.flushRevoke()).toBe(true);
  expect(await serverState(id)).toMatchObject({ consent: 0, linked_visits: 0 });
  expect(analytics.snapshot()).toMatchObject({ consent: 'denied', hasPendingRevoke: false });
});
