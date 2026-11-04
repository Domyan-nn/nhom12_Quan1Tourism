import { test, expect } from '@playwright/test';
import { installSpeech } from './support/speech.js';

const web = 'http://127.0.0.1:18174';
const api = 'http://127.0.0.1:18082';
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const heartbeat = (r) => r.url().endsWith('/api/v1/analytics/heartbeat') && r.status() === 204;
const revoke = (r) => r.url().endsWith('/api/v1/analytics/revoke') && r.status() === 204;
const sid = (page) => page.evaluate(() => localStorage.getItem('ss.analytics.sid'));
const serverState = async (request, id) => (await request.get(`${api}/__test/analytics/${id}`)).json();
async function allow(page) {
  const sent = page.waitForResponse(heartbeat);
  await page.getByRole('button', { name: 'Đồng ý thống kê', exact: true }).first().click();
  await sent;
  return sid(page);
}

test('one real API session integrates map, TTS language/controls and consent withdrawal', async ({ page, request }) => {
  const errors = [], analytics = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (r.url().includes('/analytics/')) analytics.push(r.url()); });
  await installSpeech(page);
  await page.addInitScript(() => {
    window.__gpsCalls = 0;
    navigator.geolocation.getCurrentPosition = () => window.__gpsCalls++;
    navigator.geolocation.watchPosition = () => window.__gpsCalls++;
  });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: tile }));
  await page.goto(`${web}/map`);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  expect(await page.locator('.places-map').evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(300);
  expect(analytics).toEqual([]);
  expect(await sid(page)).toBeNull();
  const id = await allow(page);
  const before = await serverState(request, id);
  expect(before).toMatchObject({ consent: 1, linked_visits: 1 });
  const place = page.getByRole('group', { name: 'Địa điểm trên bản đồ' }).getByRole('button', { name: 'Dinh Độc Lập' });
  await place.focus(); await page.keyboard.press('Space');
  await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe thuyết minh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible();
  expect(await page.evaluate(() => __speech.spoken.at(-1))).toMatchObject({ lang: 'vi-VN', text: 'Title vi. Test body vi' });
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('button', { name: 'Tiếng Việt', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect(await page.evaluate(() => __speech.active)).toBeNull();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Listen to narration', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(await page.evaluate(() => __speech.spoken.at(-1).lang)).toBe('en-US');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  expect(await page.evaluate(() => __speech.active)).toBeNull();
  const withdrawn = page.waitForResponse(revoke);
  await page.getByRole('button', { name: 'Withdraw consent', exact: true }).click();
  await withdrawn;
  expect(await sid(page)).toBeNull();
  expect(await serverState(request, id)).toEqual({ consent: 0, linked_visits: 0, total_visits: before.total_visits });
  expect((await request.post(`${api}/api/v1/analytics/heartbeat`, { data: { session_id: id } })).status()).toBe(409);
  expect(await page.evaluate(() => __gpsCalls)).toBe(0);
  expect(errors).toEqual([]);
});

test('decline never creates a session and still allows public content', async ({ page }) => {
  await page.clock.install();
  const calls = [];
  page.on('request', (r) => { if (r.url().includes('/analytics/')) calls.push(r.url()); });
  await page.goto(web);
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click();
  await page.locator('.card').first().click();
  await expect(page.locator('.narration')).toBeVisible();
  await page.clock.fastForward(90_000);
  expect(await sid(page)).toBeNull();
  expect(calls).toEqual([]);
});

test('offline withdrawal persists, retries after reopening and reaches the real backend', async ({ page, context, request }) => {
  await page.goto(web);
  const id = await allow(page);
  await page.getByRole('link', { name: 'Quyền riêng tư', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Rút đồng ý', exact: true }).click();
  await expect(page.getByText(/Yêu cầu rút đồng ý đang chờ/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đồng ý thống kê', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('ss.analytics.pendingRevoke'))).toBe(id);
  expect(await sid(page)).toBeNull();
  await page.route('**/api/v1/analytics/revoke', (r) => r.abort());
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(/Yêu cầu rút đồng ý đang chờ/)).toBeVisible();
  await page.unroute('**/api/v1/analytics/revoke');
  const done = page.waitForResponse(revoke);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await done;
  await expect(page.getByText(/Yêu cầu rút đồng ý đang chờ/)).toHaveCount(0);
  expect(await serverState(request, id)).toMatchObject({ consent: 0, linked_visits: 0 });
});

test('two tabs share the ID, synchronize withdrawal and settings navigation keeps the loop alive', async ({ page, context }) => {
  await page.clock.install();
  await page.goto(web);
  const id = await allow(page);
  await page.getByRole('link', { name: 'Quyền riêng tư', exact: true }).click();
  await page.getByRole('link', { name: 'Khám phá', exact: true }).click();
  const anotherHeartbeat = page.waitForResponse(heartbeat);
  await page.clock.fastForward(30_000);
  await anotherHeartbeat;
  const second = await context.newPage();
  await second.goto(`${web}/privacy`);
  expect(await sid(second)).toBe(id);
  await expect(second.getByRole('dialog')).toHaveCount(0);
  const done = second.waitForResponse(revoke);
  await second.getByRole('button', { name: 'Rút đồng ý', exact: true }).click();
  await done;
  await page.bringToFront();
  await page.getByRole('link', { name: 'Quyền riêng tư', exact: true }).click();
  await expect(page.locator('.ss-privacy strong')).toHaveText('Đang tắt');
  const calls = [];
  page.on('request', (r) => { if (r.url().endsWith('/analytics/heartbeat')) calls.push(r.url()); });
  await page.clock.fastForward(90_000);
  expect(calls).toEqual([]);
  expect(await sid(page)).toBeNull();
});

test('missing narration voice keeps database text visible and translates the error', async ({ page }) => {
  await installSpeech(page, { languages: ['en-US'] });
  await page.goto(`${web}/poi/palace`);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe thuyết minh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('chưa có giọng đọc Tiếng Việt');
  await expect(page.locator('.narration')).toContainText('Test body vi');
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('alert')).toContainText('no Tiếng Việt voice');
  expect(await page.evaluate(() => __speech.spoken)).toEqual([]);
});

test('speech error and unsupported pause both offer replay with text intact', async ({ page }) => {
  await installSpeech(page, { canPause: false, mode: 'error' });
  await page.goto(`${web}/poi/palace`);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe thuyết minh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không đọc được thuyết minh');
  await page.evaluate(() => { __speech.mode = 'hold'; });
  await page.getByRole('button', { name: 'Phát lại', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('không hỗ trợ tạm dừng');
  expect(await page.evaluate(() => __speech.active)).toBeNull();
  await expect(page.locator('.narration')).toContainText('Test body vi');
  await page.getByRole('button', { name: 'Phát lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dừng', exact: true })).toBeVisible();
});

test('changing language and place cancels speech, including voices loaded after leaving', async ({ page }) => {
  await installSpeech(page);
  await page.goto(`${web}/poi/palace`);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe thuyết minh', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  expect(await page.evaluate(() => __speech.active)).toBeNull();
  await page.evaluate(() => __speech.setLanguages([]));
  await page.getByRole('button', { name: 'Nghe thuyết minh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang chuẩn bị giọng đọc…', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Khám phá', exact: true }).click();
  await page.evaluate(() => __speech.setLanguages(['en-US']));
  await page.locator('.card').filter({ hasText: 'Chợ Bến Thành' }).click();
  expect(await page.evaluate(() => __speech.spoken.length)).toBe(1);
  expect(await page.evaluate(() => __speech.active)).toBeNull();
});
