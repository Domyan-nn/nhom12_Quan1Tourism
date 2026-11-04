import { test, expect } from '@playwright/test';

// Opt-in diagnostic. A successful fallback is not proof that real tiles loaded.
test('real OSM diagnostic records network outcome and checks navigation fallback', async ({ page, browser }, testInfo) => {
  test.skip(process.env.SAIGON_TEST_REAL_OSM !== '1', 'Opt in to real external OSM traffic');
  const failures = [], responses = [];
  page.on('requestfailed', (r) => {
    if (r.url().startsWith('https://tile.openstreetmap.org/')) failures.push(r.failure()?.errorText);
  });
  page.on('response', (r) => {
    if (r.url().startsWith('https://tile.openstreetmap.org/')) responses.push(r.status());
  });
  await page.goto('http://127.0.0.1:18174/map');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  await expect(page.getByText('Đang tải bản đồ…', { exact: true })).toHaveCount(0, { timeout: 16000 });
  const images = await page.locator('.leaflet-tile').evaluateAll((els) => els.filter(el => el.naturalWidth > 0).length);
  const tileError = await page.getByRole('alert').count();
  const result = {
    browser: browser.version(), realTilesLoaded: responses.some(s => s >= 200 && s < 300) && images > 0 && !tileError,
    successfulTileResponses: responses.filter(s => s >= 200 && s < 300).length,
    failedRequests: failures, responseStatuses: responses, images, tileError: !!tileError,
  };
  console.log('OSM_DIAGNOSTIC ' + JSON.stringify(result));
  await testInfo.attach('osm-network.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('osm-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('osm-mobile-width.png'), fullPage: true });
  await page.getByRole('group', { name: 'Địa điểm trên bản đồ' }).getByRole('button', { name: 'Dinh Độc Lập' }).click();
  await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Quay lại danh sách', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(2);
});
