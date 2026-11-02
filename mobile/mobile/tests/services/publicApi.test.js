import { createPublicApi } from '../../src/services/publicApi';
import { createApiClient } from '../../src/services/apiClient';

test('v1 uses backend routes, unwraps lists and preserves detail narrations', async () => {
  const client = { get: jest.fn().mockResolvedValueOnce({ items: [{ id: 'c', name: 'Di tích', name_en: 'Heritage' }] })
    .mockResolvedValueOnce({ items: [{ id: 'p', narration_locales: ['vi'] }] })
    .mockResolvedValueOnce({ id: 'p', narrations: [{ locale: 'vi', title: 'A', body: 'B' }] }) };
  const api = createPublicApi({ client, useMock: false });
  expect((await api.listCategories())[0].name_en).toBe('Heritage');
  expect((await api.listPois({ categoryId: 'c' }))[0].narration_locales).toEqual(['vi']);
  expect((await api.getPoi('p')).narrations).toHaveLength(1);
  expect(client.get).toHaveBeenNthCalledWith(1, '/v1/categories');
  expect(client.get).toHaveBeenNthCalledWith(2, '/v1/pois', { q: '', category_id: 'c' });
  expect(client.get).toHaveBeenNthCalledWith(3, '/v1/pois/p');
});

test('invalid list or detail response is an error, not an empty result', async () => {
  const client = { get: jest.fn().mockResolvedValue({ unexpected: true }) };
  const api = createPublicApi({ client, useMock: false });
  await expect(api.listCategories()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  await expect(api.getPoi('p')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

test('API failures and malformed successful responses are reported', async () => {
  const invalid = createApiClient({ baseUrl: 'http://example/api', fetchImpl: async () => ({ status: 200, ok: true, json: async () => { throw Error('bad json'); } }) });
  await expect(invalid.get('/v1/categories')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  const failure = createApiClient({ baseUrl: 'http://example/api', fetchImpl: async () => ({ status: 404, ok: false, json: async () => ({ error: { code: 'POI_NOT_FOUND' } }) }) });
  await expect(failure.get('/v1/pois/missing')).rejects.toMatchObject({ status: 404, code: 'POI_NOT_FOUND' });
});
