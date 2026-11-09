import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiGet } from '../src/api/client.js';
import { createPublicApi } from '../src/api/publicApi.js';

test('real mode unwraps items, preserves narration_locales and encodes parameters', async () => {
  const urls = [];
  const apiGet = createApiGet({ baseUrl: '/api/v1/', fetchImpl: async (url) => {
    urls.push(url);
    return Response.json({ items: [{ id: 'p', narration_locales: ['vi', 'fr'] }] });
  } });
  const api = createPublicApi({ apiGet, useMock: false });
  assert.deepEqual(await api.listCategories(), [{ id: 'p', narration_locales: ['vi', 'fr'] }]);
  const items = await api.listPois({ q: 'Đức & Bà', categoryId: 'cat 1' });
  assert.deepEqual(items[0].narration_locales, ['vi', 'fr']);
  assert.equal(urls[0], '/api/v1/categories');
  const url = new URL(urls[1], 'http://test');
  assert.equal(url.pathname, '/api/v1/pois');
  assert.equal(url.searchParams.get('q'), 'Đức & Bà');
  assert.equal(url.searchParams.get('category_id'), 'cat 1');
});

test('real detail preserves narrations and 404 code without falling back to mock', async () => {
  const apiGet = createApiGet({ fetchImpl: async (url) => url.endsWith('/missing')
    ? Response.json({ error: { code: 'POI_NOT_FOUND', message: 'Gone' } }, { status: 404 })
    : Response.json({ id: 'p', narrations: [{ locale: 'fr', title: 'Titre', body: 'Texte' }] }) });
  const api = createPublicApi({ apiGet, useMock: false });
  assert.equal((await api.getPoi('p')).narrations[0].locale, 'fr');
  await assert.rejects(api.getPoi('missing'), { status: 404, code: 'POI_NOT_FOUND' });
});

test('empty lists, network failure and invalid envelopes remain distinct', async () => {
  const apiFor = (fetchImpl) => createPublicApi({ useMock: false, apiGet: createApiGet({ fetchImpl }) });
  assert.deepEqual(await apiFor(async () => Response.json({ items: [] })).listPois(), []);
  await assert.rejects(apiFor(async () => { throw new Error('offline'); }).listPois(), { code: 'NETWORK_ERROR', status: 0 });
  await assert.rejects(apiFor(async () => Response.json([])).listPois(), { code: 'INVALID_RESPONSE' });
  await assert.rejects(apiFor(async () => new Response('not json')).listPois(), { code: 'INVALID_RESPONSE' });
  await assert.rejects(apiFor(async () => Response.json({ id: 'bad' })).getPoi('bad'), { code: 'INVALID_RESPONSE' });
});

test('mock mode makes no network calls; filters NFC, category and combination', async () => {
  const api = createPublicApi({ useMock: true, apiGet: () => { throw new Error('unexpected network'); } });
  assert.equal((await api.listCategories()).length, 2);
  const items = await api.listPois({ q: '  ĐỨC BÀ  '.normalize('NFD'), categoryId: 'cat-1' });
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].narration_locales, ['vi', 'en']);
  assert.equal(items[0].narrations, undefined);
  assert.deepEqual(await api.listPois({ q: 'Đức', categoryId: 'cat-2' }), []);
  assert.deepEqual(await api.listPois({ q: 'not found' }), []);
  assert.equal((await api.getPoi(items[0].id)).narrations.length, 2);
  await assert.rejects(api.getPoi('missing'), { status: 404 });
});

test('mock search ignores Vietnamese diacritics like the backend (BR02)', async () => {
  const api = createPublicApi({ useMock: true, apiGet: () => { throw new Error('unexpected network'); } });
  const ids = async (q) => (await api.listPois({ q })).map((p) => p.id);
  assert.equal((await ids('Đức Bà')).length, 1);
  assert.deepEqual(await ids('duc ba'), await ids('Đức Bà'));
  assert.deepEqual(await ids('DUC BA'), await ids('Đức Bà'));
  assert.deepEqual(await ids('duc ba xyz'), []);
});
