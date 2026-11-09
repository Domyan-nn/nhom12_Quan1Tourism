import { test, expect } from '@playwright/test';

const mock = 'http://127.0.0.1:18173';
const real = 'http://127.0.0.1:18174';

test('mock is labelled, never calls API, and UI language preserves selected narration', async ({ page }) => {
  const apiCalls = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url());
  });
  await page.goto(mock);
  await expect(page.locator('.mode-notice')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(5);
  await page.locator('.card').filter({ hasText: 'Nhà thờ Đức Bà' }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('.narration h2')).toHaveText('Notre-Dame Cathedral');
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.narration h2')).toHaveText('Notre-Dame Cathedral');
  await expect(page.getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(apiCalls).toEqual([]);
});

test('real API lists only published POIs, renders locales and supports languages beyond VI/EN', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(real);
  await expect(page.locator('.card')).toHaveCount(2);
  await expect(page.locator('.mode-notice')).toHaveCount(0);
  await expect(page.locator('.card').first()).toContainText('EN / FR / VI');
  await page.locator('.card').filter({ hasText: 'Dinh Độc Lập' }).click();
  await page.getByRole('button', { name: 'Français', exact: true }).click();
  await expect(page.locator('.narration h2')).toHaveText('Title fr');
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('button', { name: 'Français', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.narration h2')).toHaveText('Title fr');
  expect(errors).toEqual([]);
});

test('real search, category filter, combination and empty state', async ({ page }) => {
  await page.goto(real);
  await expect(page.locator('.card')).toHaveCount(2);
  await page.getByRole('button', { name: 'history', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('  ĐỘC LẬP  '.normalize('NFD'));
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('button', { name: 'culture', exact: true }).click();
  await expect(page.getByText('Không có địa điểm phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card')).toContainText('Chợ Bến Thành');
});

test('category labels follow the UI language and preserve the selected filter', async ({ page }) => {
  await page.goto(real);
  await page.getByRole('button', { name: 'history', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByRole('button', { name: 'History', exact: true })).toHaveClass(/\bon\b/);
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card')).toContainText('History');
});

test('network error shows retry and recovers without mock fallback', async ({ page }) => {
  await page.route('**/api/v1/pois*', (route) => route.abort());
  await page.goto(real);
  await expect(page.getByRole('alert')).toContainText('Không kết nối được tới máy chủ.');
  await expect(page.locator('.card')).toHaveCount(0);
  await page.unroute('**/api/v1/pois*');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(2);
});

test('missing, draft and hidden detail show unavailable', async ({ page }) => {
  for (const id of ['missing', 'draft', 'hidden']) {
    await page.goto(`${real}/poi/${id}`);
    await expect(page.getByText('Địa điểm không còn khả dụng', { exact: true })).toBeVisible();
    await expect(page.locator('.narration')).toHaveCount(0);
  }
});

test('loading and category errors are visible and translated', async ({ page }) => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/v1/pois', async (route) => { await wait; await route.continue(); });
  await page.route('**/api/v1/categories', (route) => route.abort());
  await page.goto(real);
  await expect(page.getByText('Đang tải…', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Không tải được danh mục.');
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Could not load categories.');
  release();
  await expect(page.locator('.card')).toHaveCount(2);
});

test('privacy describes its current functionality in both languages', async ({ page }) => {
  await page.goto(`${real}/privacy`);
  await expect(page.locator('.prose').getByText(/Chỉ khi bạn đồng ý/)).toBeVisible();
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(page.locator('.prose').getByText(/Only with your consent/)).toBeVisible();
});
