import { test, expect } from '@playwright/test';

const real = 'http://127.0.0.1:18174';
const mock = 'http://127.0.0.1:18173';
const api = 'http://127.0.0.1:18082';
// Local tile fixture: browser tests never depend on external tile servers.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const primaryTiles = 'https://tile.openstreetmap.org/**';
const secondaryTiles = 'https://tile.openstreetmap.de/**';
const tiles = (page) => page.route('https://tile.openstreetmap.org/**', (route) =>
  route.fulfill({ contentType: 'image/png', body: tile }));
const places = (page) => page.getByRole('group', { name: 'Địa điểm trên bản đồ' });

test.beforeEach(async ({ page }) => {
  await tiles(page);
  await page.route(secondaryTiles, (route) => route.abort());
});

test('real public API map draws published markers, opens summary and correct multilingual detail', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  expect((await (await request.get(`${api}/api/v1/pois`)).json()).items.map((p) => p.id).sort()).toEqual(['market', 'palace']);
  await page.goto(`${real}/map`);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect(page.getByText('Đang tải bản đồ…', { exact: true })).toHaveCount(0);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  const marker = page.locator('.leaflet-marker-icon[title="Dinh Độc Lập"]');
  await marker.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name: 'Tóm tắt địa điểm' })).toContainText('Dinh Độc Lập');
  await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).click();
  await expect(page).toHaveURL(`${real}/poi/palace`);
  await page.getByRole('button', { name: 'fr', exact: true }).click();
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('button', { name: 'fr', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.narration h2')).toHaveText('Title fr');
  expect(errors).toEqual([]);
});

test('mock map is labelled and makes no API requests', async ({ page }) => {
  const calls = [];
  page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/')) calls.push(r.url()); });
  await page.goto(`${mock}/map`);
  await expect(page.locator('.mode-notice')).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
  await places(page).getByRole('button').first().click();
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});

test('mixed valid and malformed API coordinates/IDs do not break map or fitting', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/v1/pois', (r) => r.fulfill({ json: { items: [
    { id: 'palace', name: 'Dinh Độc Lập', latitude: 10.777, longitude: 106.695 },
    { id: 'null', latitude: null, longitude: 106 }, { id: 'lat', latitude: 91, longitude: 106 },
    { id: 'lon', latitude: 10, longitude: -181 }, { id: 'str', latitude: '10', longitude: 106 },
    { id: '', latitude: 10, longitude: 106 }, { id: {}, latitude: 10, longitude: 106 }, null,
  ] } }));
  await page.goto(`${real}/map`);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await places(page).getByRole('button', { name: 'Dinh Độc Lập' }).click();
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveAttribute('href', '/poi/palace');
  expect(errors).toEqual([]);
});

for (const items of [[], [{ id: 'bad', name: 'Invalid coordinates', address: 'Fixture', latitude: null, longitude: 0 }]]) {
  test(`empty map with ${items.length} input places provides list fallback in VI/EN`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/v1/pois', (r) => r.fulfill({ json: { items } }));
    await page.goto(`${real}/map`);
    await expect(page.getByText('Chưa có địa điểm có tọa độ hợp lệ', { exact: true })).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
    await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
    await expect(page.getByText('No places with valid coordinates yet', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Back to places', exact: true }).click();
    await expect(page).toHaveURL(`${real}/`);
    await expect(page.getByRole('heading', { name: 'Explore District 1' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('slow API has loading state and recovers', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/v1/pois', async (route) => { await gate; await route.continue(); });
  await page.goto(`${real}/map`);
  try { await expect(page.getByText('Đang tải…', { exact: true })).toBeVisible(); }
  finally { release(); }
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
});

for (const failure of ['network', 'server']) {
  test(`map ${failure} error retries real API without switching to mock`, async ({ page }) => {
    await page.route('**/api/v1/pois', (r) => failure === 'network' ? r.abort() : r.fulfill({ status: 500, json: {} }));
    await page.goto(`${real}/map`);
    await expect(page.getByRole('alert')).toContainText(failure === 'network' ? 'Không kết nối được' : 'Không tải được dữ liệu');
    await expect(page.locator('.mode-notice')).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
    await page.unroute('**/api/v1/pois');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  });
}

test('secondary tile source displays the street map when primary source fails', async ({ page }) => {
  await page.unroute(primaryTiles);
  await page.route(primaryTiles, (route) => route.abort());
  await page.unroute(secondaryTiles);
  await page.route(secondaryTiles, (route) => route.fulfill({ contentType: 'image/png', body: tile }));
  await page.goto(`${real}/map`);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap Deutschland');
  await expect(page.locator('.leaflet-tile').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('tile error keeps summary controls and list fallback usable; retry restores map', async ({ page }) => {
  await page.unroute(primaryTiles);
  await page.route(primaryTiles, (r) => r.abort());
  await page.goto(`${real}/map`);
  await expect(page.getByRole('alert')).toContainText('Không tải được nền bản đồ');
  await expect(page.locator('.places-map-wrap')).toHaveClass(/is-map-fallback/);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect(page.locator('.leaflet-tile')).toHaveCount(0);
  await places(page).getByRole('button', { name: 'Dinh Độc Lập' }).click();
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quay lại danh sách', exact: true })).toBeVisible();
  await page.unroute('https://tile.openstreetmap.org/**'); await tiles(page);
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('place hidden after list load is rejected by real API at marker and detail', async ({ page, request }) => {
  await page.goto(`${real}/map`);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  try {
    expect((await request.put(`${api}/__test/pois/palace/status?status=hidden`)).ok()).toBeTruthy();
    await places(page).getByRole('button', { name: 'Dinh Độc Lập' }).click();
    await expect(page.getByRole('alert')).toContainText('Địa điểm không còn khả dụng');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveCount(0);
    await page.goto(`${real}/poi/palace`);
    await expect(page.getByText('Địa điểm không còn khả dụng', { exact: true })).toBeVisible();
  } finally { await request.put(`${api}/__test/pois/palace/status?status=published`); }
});

test('detail validation network error is retryable and cannot open unchecked detail', async ({ page }) => {
  await page.route('**/api/v1/pois/palace', (r) => r.abort());
  await page.goto(`${real}/map`);
  await places(page).getByRole('button', { name: 'Dinh Độc Lập' }).click();
  await expect(page.getByRole('alert')).toContainText('Không kết nối được');
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveCount(0);
  await page.unroute('**/api/v1/pois/palace');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toBeVisible();
});

test('stale marker validation cannot overwrite a later selection; narrow viewport has no overflow', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/pois/palace', async (r) => { await gate; await r.fulfill({ status: 404, json: {} }); });
  await page.goto(`${real}/map`);
  await places(page).getByRole('button', { name: 'Dinh Độc Lập' }).click();
  await places(page).getByRole('button', { name: 'Chợ Bến Thành' }).click();
  release();
  await expect(page.getByRole('article', { name: 'Tóm tắt địa điểm' })).toContainText('Chợ Bến Thành');
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveAttribute('href', '/poi/market');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
