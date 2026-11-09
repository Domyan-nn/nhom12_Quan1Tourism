import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// All HTTP calls below use the real FastAPI app backed by serve_api.py's
// disposable SQLite fixture. Only map tiles and explicitly induced errors are
// intercepted; these cases make no claim about production content or GPS/TTS.
const admin = 'http://127.0.0.1:18175';
const guest = 'http://127.0.0.1:18174';
const api = 'http://127.0.0.1:18082/api/v1';
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');

async function login(page) {
  await page.goto(admin);
  await page.getByLabel('Tên đăng nhập').fill('browser-admin');
  await page.getByLabel('Mật khẩu').fill('browser-test-only');
  const loggedIn = page.waitForResponse(r => r.url().endsWith('/admin/login') && r.status() === 200);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const { access_token } = await (await loggedIn).json();
  await expect(page.getByText('Đã đăng nhập')).toBeVisible();
  return { Authorization: `Bearer ${access_token}` };
}

test('UC09 Admin publication rejects missing narration, publishes and hides across the real public API', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const headers = await login(page);
  const created = await request.post(`${api}/admin/pois`, { headers, data: {
    name: 'UC09 disposable browser place', address: 'Test fixture only', category_id: 'history',
    latitude: 10.77, longitude: 106.69, radius_m: 100, image_url: null,
  } });
  expect(created.status()).toBe(201);
  const poi = await created.json();
  try {
    expect(poi.status).toBe('draft');
    // Reload to see the place created through the API; the session survives reload (UC05-A1).
    await page.reload();
    await expect(page.getByText('Đã đăng nhập')).toBeVisible();
    await page.locator('.places > .category-list > li').filter({ hasText: poi.name })
      .getByRole('button', { name: 'Sửa', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Công bố', exact: true }).click();
    await expect(page.locator('.places [role="alert"]')).toContainText('Chưa đủ điều kiện công bố');
    await expect(page.locator('.places [role="alert"]')).toContainText('Thuyết minh');
    expect((await request.get(`${api}/pois/${poi.id}`)).status()).toBe(404);

    const narration = page.locator('.places .place-form').last();
    await narration.getByLabel('Mã ngôn ngữ').fill('fr');
    await narration.getByLabel('Tiêu đề').fill('Fixture reviewed only for testing');
    await narration.getByLabel('Nội dung').fill('Disposable test narration, not approved tourism content.');
    await narration.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.locator('.places > section').last()).toContainText('fr · Fixture reviewed only for testing');
    await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Hide place', exact: true })).toBeVisible();
    const publicDetail = await request.get(`${api}/pois/${poi.id}`);
    expect(publicDetail.status()).toBe(200);
    expect((await publicDetail.json()).narration_locales).toEqual(['fr']);
    expect((await (await request.get(`${api}/pois`)).json()).items.map(p => p.id)).toContain(poi.id);
    await page.getByLabel('Interface language').selectOption('vi');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Ẩn địa điểm', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Công bố', exact: true })).toBeVisible();
    expect((await request.get(`${api}/pois/${poi.id}`)).status()).toBe(404);
    expect((await (await request.get(`${api}/pois`)).json()).items.map(p => p.id)).not.toContain(poi.id);
    expect(errors).toEqual([]);
  } finally {
    expect((await request.delete(`${api}/admin/pois/${poi.id}`, { headers })).status()).toBe(204);
  }
});

test('UC10-11 dashboard shows real numbers and Vietnam dates, refreshes after 30s and distinguishes errors from zero', async ({ page, request }) => {
  await page.clock.install();
  const session_id = randomUUID();
  expect((await request.post(`${api}/analytics/heartbeat`, { data: { session_id } })).status()).toBe(204);
  const firstActive = page.waitForResponse(r => r.url().endsWith('/admin/stats/active') && r.status() === 200);
  const firstVisits = page.waitForResponse(r => r.url().endsWith('/admin/stats/visits') && r.status() === 200);
  await login(page);
  const active = await (await firstActive).json();
  const visits = await (await firstVisits).json();
  const dashboard = page.locator('.dashboard');
  const activeSection = dashboard.locator('section').first();
  const visitsSection = dashboard.locator('section').last();
  await expect(activeSection.locator('.stat-number')).toHaveText(String(active.active_sessions));
  expect(active.active_sessions).toBeGreaterThanOrEqual(1);
  expect(active.window_seconds).toBe(90);
  await expect(visitsSection.locator('.stat-row .stat-number')).toHaveText([String(visits.today), String(visits.last_7_days)]);
  expect(visits.timezone).toBe('Asia/Ho_Chi_Minh');

  const from = dashboard.getByLabel('Từ ngày', { exact: true });
  const to = dashboard.getByLabel('Đến ngày', { exact: true });
  const today = await to.getAttribute('max');
  await from.fill(today);
  await to.fill(today);
  const filtered = page.waitForResponse(r => r.url().includes('/admin/stats/visits?') && r.status() === 200);
  await dashboard.getByRole('button', { name: 'Xem', exact: true }).click();
  const range = (await (await filtered).json()).range;
  await expect(dashboard.locator('tbody tr')).toHaveCount(1);
  await expect(dashboard.locator('tbody td')).toHaveText([today, String(range.total)]);
  await expect(dashboard).toContainText('giờ Việt Nam (UTC+7)');

  // HTML min/max also restrict the date picker to the inclusive 30-day window.
  const minimum = await from.getAttribute('min');
  expect((new Date(today) - new Date(minimum)) / 86400000).toBe(29);
  await from.fill(today);
  await to.fill(minimum);
  await dashboard.getByRole('button', { name: 'Xem', exact: true }).click();
  await expect(dashboard.getByRole('alert')).toContainText('Khoảng ngày không hợp lệ');
  await dashboard.getByRole('button', { name: 'Bỏ lọc', exact: true }).click();

  const refreshed = page.waitForResponse(r => r.url().endsWith('/admin/stats/active') && r.status() === 200);
  await page.clock.fastForward(30_000);
  await refreshed;
  await page.route('**/api/v1/admin/stats/active', r => r.abort());
  await activeSection.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(activeSection.getByRole('alert')).toContainText('Không khả dụng');
  await expect(activeSection.locator('.stat-number')).toHaveCount(0);
  await expect(activeSection).toContainText('Lần thành công gần nhất');
  await page.unroute('**/api/v1/admin/stats/active');
  await activeSection.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(activeSection.locator('.stat-number')).toBeVisible();

  await page.route('**/api/v1/admin/stats/visits*', r => r.fulfill({ status: 500, json: { error: { code: 'DATABASE_ERROR' } } }));
  await from.fill(today); await to.fill(today);
  await dashboard.getByRole('button', { name: 'Xem', exact: true }).click();
  await expect(visitsSection.getByRole('alert')).toContainText('Không khả dụng');
  await expect(visitsSection.locator('.stat-number')).toHaveCount(0);
  await page.unroute('**/api/v1/admin/stats/visits*');
  await visitsSection.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(visitsSection.locator('.stat-row .stat-number')).toHaveCount(2);
  expect((await request.post(`${api}/analytics/revoke`, { data: { session_id } })).status()).toBe(204);
});

for (const width of [375, 768, 1440]) {
  test(`NFR04 guest list/map/detail/privacy and Admin fit ${width}px with VI/EN controls`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://tile.openstreetmap.org/**', r => r.fulfill({ contentType: 'image/png', body: tile }));
    for (const route of ['', '/map', '/poi/palace', '/privacy']) {
      await page.goto(`${guest}${route}`);
      await expect(page.locator('main')).toBeVisible();
      if (route === '') {
        await expect(page.locator('.card')).toHaveCount(2);
        await expect(page.locator('.card').filter({ hasText: 'Dinh Độc Lập' })).toBeVisible();
      } else if (route === '/map') {
        await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
        await expect(page.locator('.places-map-wrap .state')).toHaveCount(0);
      } else if (route === '/poi/palace') {
        await expect(page.locator('.narration')).toContainText('Test body en');
      } else {
        await expect(page.locator('.prose')).toBeVisible();
        await expect(page.locator('.prose .ss-privacy')).toBeVisible();
      }
      for (const language of ['vi', 'en']) {
        await page.locator('.language-picker select').selectOption(language);
        if (route === '/map') {
          await expect(page.locator('.leaflet-control-zoom-in')).toHaveAttribute('title', language === 'vi' ? 'Phóng to' : 'Zoom in');
          await expect(page.locator('.places-map-wrap .state')).toHaveCount(0);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route || '/'} ${language} at ${width}px`).toBe(true);
      }
      if (route === '/map') await page.screenshot({ path: testInfo.outputPath(`guest-map-${width}.png`), fullPage: true });
    }
    await login(page);
    await expect(page.locator('.dashboard .stat-row .stat-number')).toHaveCount(2);
    await expect(page.locator('.category-form').locator('..').locator('.category-list > li')).toHaveCount(2);
    await expect(page.locator('.places > .category-list > li')).toHaveCount(4);
    for (const language of ['vi', 'en']) {
      await page.locator('nav select').selectOption(language);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin ${language} at ${width}px`).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`admin-${width}.png`), fullPage: true });
  });
}
