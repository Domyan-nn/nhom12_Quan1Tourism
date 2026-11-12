import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:18175';
const guest = 'http://127.0.0.1:18174';
const openTab = (page, name) => page.getByRole('tab', { name, exact: true }).click();

async function login(page) {
  await page.goto(admin);
  await page.getByLabel('Tên đăng nhập').fill('browser-admin');
  await page.getByLabel('Mật khẩu').fill('browser-test-only');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/v1/admin/login') && r.status() === 200);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const token = (await (await response).json()).access_token;
  await expect(page.getByText('Đã đăng nhập')).toBeVisible();
  return token;
}

test('Admin rejects incorrect password, reports network errors, logs out and rejects reused token', async ({ page, request }) => {
  await page.goto(admin);
  await page.getByLabel('Tên đăng nhập').fill('browser-admin');
  await page.getByLabel('Mật khẩu').fill('incorrect-test-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tên đăng nhập hoặc mật khẩu không đúng');
  const token = await login(page);
  await page.route('**/api/v1/admin/logout', (r) => r.abort());
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không kết nối được API');
  await expect(page.getByText('Đã đăng nhập')).toBeVisible();
  await page.unroute('**/api/v1/admin/logout');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  const reuse = await request.get('http://127.0.0.1:18082/api/v1/admin/categories', { headers: { Authorization: `Bearer ${token}` } });
  expect(reuse.status()).toBe(401);
});

test('Repeated failed sign-ins are throttled with a clear message (NFR01)', async ({ page }) => {
  // A separate, non-existent name: the shared browser-admin account must stay usable for later tests.
  await page.goto(admin);
  await page.getByLabel('Tên đăng nhập').fill('throttle-check');
  await page.getByLabel('Mật khẩu').fill('wrong-test-password');
  for (let attempt = 0; attempt < 5; attempt++) {
    const answered = page.waitForResponse((r) => r.url().endsWith('/api/v1/admin/login') && r.status() === 401);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await answered;
  }
  const blocked = page.waitForResponse((r) => r.url().endsWith('/api/v1/admin/login') && r.status() === 429);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await blocked;
  await expect(page.getByRole('alert')).toContainText('Đăng nhập sai quá nhiều lần');
});

test('Admin session survives reload in the same tab until logout or revocation (UC05-A1)', async ({ page, request }) => {
  const token = await login(page);
  await page.reload();
  await expect(page.getByText('Đã đăng nhập · browser-admin')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  expect((await request.get('http://127.0.0.1:18082/api/v1/admin/me', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);

  const second = await login(page);
  // Let the dashboard/category/place loads finish first; a 401 on them would end the page session before reload.
  await page.waitForLoadState('networkidle');
  const revoked = await request.post('http://127.0.0.1:18082/api/v1/admin/logout', { headers: { Authorization: `Bearer ${second}` } });
  expect(revoked.status()).toBe(204);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Phiên đã hết hạn hoặc bị thu hồi');
});

test('Admin category CRUD, NFC duplicates, validation, used category and translated controls', async ({ page }) => {
  await login(page);
  await openTab(page, 'Danh mục');
  const form = page.locator('.category-form');
  const list = page.locator('.category-form').locator('..').locator('.category-list');
  await form.getByLabel('Tên tiếng Việt').fill('   ');
  await form.getByLabel('Tên tiếng Anh').fill('Valid');
  await form.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tên không được để trống');
  await form.getByLabel('Tên tiếng Việt').fill('  Café browser  ');
  await form.getByLabel('Tên tiếng Anh').fill('  Browser coffee  ');
  await form.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  const row = list.locator('li').filter({ hasText: 'Café browser / Browser coffee' });
  await expect(row).toBeVisible();
  await form.getByLabel('Tên tiếng Việt').fill(' CAFE\u0301 BROWSER ');
  await form.getByLabel('Tên tiếng Anh').fill('Other name');
  await form.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tên danh mục đã tồn tại');
  await row.getByRole('button', { name: 'Sửa', exact: true }).click();
  await form.getByLabel('Tên tiếng Việt').fill('Café updated');
  await form.getByLabel('Tên tiếng Anh').fill('Coffee updated');
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  const updated = list.locator('li').filter({ hasText: 'Café updated / Coffee updated' });
  await expect(updated).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await list.locator('li').filter({ hasText: 'history / History' }).getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Danh mục đang được địa điểm sử dụng');
  await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
  await expect(updated).toContainText('Café updated / Coffee updated');
  page.once('dialog', (dialog) => dialog.accept());
  await updated.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(updated).toHaveCount(0);
});

test('Admin category load error retries and revoked session returns to sign in', async ({ page, request }) => {
  await page.route('**/api/v1/admin/categories', (r) => r.abort());
  const token = await login(page);
  await openTab(page, 'Danh mục');
  const categories = page.locator('.category-form').locator('..');
  await expect(categories.getByRole('alert')).toContainText('Không kết nối được API');
  await page.unroute('**/api/v1/admin/categories');
  await categories.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.category-form').locator('..').locator('.category-list li')).toHaveCount(2);
  expect((await request.post('http://127.0.0.1:18082/api/v1/admin/logout', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(204);
  await page.getByLabel('Tên tiếng Việt').fill('Expired');
  await page.getByLabel('Tên tiếng Anh').fill('Expired');
  await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Phiên đã hết hạn hoặc bị thu hồi');
});

test('Admin saves a draft and narration, while guest sees only published places', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(admin);
  await page.getByLabel('Tên đăng nhập').fill('browser-admin');
  await page.getByLabel('Mật khẩu').fill('browser-test-only');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByText('Đã đăng nhập')).toBeVisible();
  await openTab(page, 'Địa điểm');
  await expect(page).toHaveURL(/#places$/);
  await expect(page.locator('.places .category-list li')).toHaveCount(4);
  // Filters: diacritic-insensitive name search and status filter, then back to all places.
  await page.getByLabel('Tìm địa điểm').fill('cho ben');
  await expect(page.locator('.places .category-list li')).toHaveCount(1);
  await page.getByLabel('Tìm địa điểm').fill('');
  await page.getByLabel('Lọc trạng thái').selectOption('hidden');
  await expect(page.locator('.places .category-list li')).toHaveText([/Private hidden · Ẩn/]);
  await page.getByLabel('Lọc trạng thái').selectOption('');
  await expect(page.locator('.places .category-list li')).toHaveCount(4);
  await page.getByRole('button', { name: 'Thêm địa điểm' }).click();
  const form = page.locator('.places .place-form').first();
  await form.getByLabel('Tên').fill('Browser test place');
  await form.getByLabel('Địa chỉ').fill('Temporary address');
  await form.getByLabel('Danh mục').selectOption('history');
  await form.getByLabel('Vĩ độ').fill('10.77');
  await form.getByLabel('Kinh độ').fill('106.69');
  await form.getByLabel('Bán kính (m)').fill('100');
  const creating = page.waitForResponse(r => r.url().endsWith('/api/v1/admin/pois') && r.status() === 201);
  await form.getByRole('button', { name: 'Lưu' }).click();
  const poiId = (await (await creating).json()).id;
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser test place' })).toContainText('Nháp');
  await expect(page.getByText('Đã lưu thành công.')).toBeVisible();

  await form.getByLabel('Tên').fill('Browser edited place');
  await form.getByLabel('Bán kính (m)').fill('1000');
  await form.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser edited place' })).toContainText('Nháp');

  const narr = page.locator('.places .place-form').last();
  await expect(narr.locator('option[value="xx"]')).toHaveCount(0);
  await narr.getByLabel('Ngôn ngữ thuyết minh').selectOption('fr');
  await narr.getByLabel('Tiêu đề').fill('Titre de test');
  await narr.getByLabel('Nội dung').fill('Texte saisi par le test');
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'fr · Titre de test' })).toBeVisible();

  // BR03: a language that already has a narration cannot be chosen again (the API also returns 409).
  await expect(narr.locator('option[value="fr"]')).toHaveAttribute('disabled', '');
  await expect(narr.locator('option[value="fr"]')).toContainText('đã có bài');
  await page.locator('.places li').filter({ hasText: 'fr · Titre de test' }).getByRole('button', { name: 'Sửa', exact: true }).click();
  await expect(narr.getByLabel('Ngôn ngữ thuyết minh')).toBeDisabled();
  await narr.getByLabel('Tiêu đề').fill('   ');
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places [role="alert"]')).toContainText('Kiểm tra các trường bắt buộc');
  await narr.getByLabel('Tiêu đề').fill('Titre modifié');
  await narr.getByLabel('Nội dung').fill('Texte modifié');
  await page.route(`**/api/v1/admin/pois/${poiId}/narrations/*`, r => r.abort());
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places [role="alert"]')).toContainText('Không kết nối được API');
  await expect(narr.getByLabel('Nội dung')).toHaveValue('Texte modifié');
  await page.unroute(`**/api/v1/admin/pois/${poiId}/narrations/*`);
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places li').filter({ hasText: 'fr · Titre modifié' })).toBeVisible();

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(`**/api/v1/admin/pois/${poiId}`, async r => { await gate; await r.continue(); });
  await form.getByRole('button', { name: 'Lưu' }).click();
  try {
    await expect(page.getByRole('button', { name: 'Thêm địa điểm', exact: true })).toBeDisabled();
    await expect(form.getByLabel('Tên')).toBeDisabled();
  } finally { release(); }
  await expect(form.getByLabel('Tên')).toBeEnabled();
  await page.unroute(`**/api/v1/admin/pois/${poiId}`);

  const guestPage = await page.context().newPage();
  await guestPage.goto(guest);
  await expect(guestPage.locator('.card')).toHaveCount(2);
  await expect(guestPage.getByText('Browser edited place')).toHaveCount(0);
  await guestPage.close();

  // UC08: delete a narration typed by mistake; cancelling the confirmation keeps it.
  const frRow = page.locator('.places li').filter({ hasText: 'fr · Titre modifié' });
  page.once('dialog', dialog => dialog.dismiss());
  await frRow.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(frRow).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await frRow.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(frRow).toHaveCount(0);
  await expect(page.getByText('Chưa có bài thuyết minh.')).toBeVisible();
  await expect(narr.locator('option[value="fr"]')).not.toHaveAttribute('disabled');

  page.once('dialog', dialog => dialog.dismiss());
  await form.getByRole('button', { name: 'Xóa' }).click();
  await expect(page.locator('.places li').filter({ hasText: 'Browser edited place' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await form.getByRole('button', { name: 'Xóa' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser edited place' })).toHaveCount(0);
  const pois = await request.get('http://127.0.0.1:18082/api/v1/pois');
  expect((await pois.json()).items).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('Admin uploads an image with credit, guest sees both, and removing it clears them (F07)', async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
  await login(page);
  await openTab(page, 'Địa điểm');
  await page.locator('.places .category-list li').filter({ hasText: 'Dinh Độc Lập' }).getByRole('button', { name: 'Sửa', exact: true }).click();
  const form = page.locator('.places .place-form').first();

  // Wrong type is refused before any upload.
  await form.getByLabel('Tải ảnh lên').setInputFiles({ name: 'animation.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(form.getByRole('alert')).toContainText('Chỉ nhận ảnh JPG, PNG hoặc WebP');

  const uploaded = page.waitForResponse((r) => r.url().endsWith('/image') && r.request().method() === 'PUT' && r.status() === 200);
  await form.getByLabel('Tải ảnh lên').setInputFiles({ name: 'palace.png', mimeType: 'image/png', buffer: png });
  const imageUrl = (await (await uploaded).json()).image_url;
  expect(imageUrl).toMatch(/^\/api\/media\/pois\/[0-9a-f-]{36}\.png$/);
  await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
  await expect(form.locator('img.place-preview')).toHaveAttribute('src', imageUrl);
  await form.getByLabel('Ghi công ảnh').fill('Test photographer, CC BY 4.0, Wikimedia Commons');
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã lưu thành công.')).toBeVisible();

  const guestPage = await page.context().newPage();
  await guestPage.goto(`${guest}/poi/palace`);
  const photo = guestPage.locator('.poi-photo');
  await expect(photo.locator('figcaption')).toHaveText('Ảnh: Test photographer, CC BY 4.0, Wikimedia Commons');
  await expect.poll(() => photo.locator('img').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);

  page.once('dialog', (dialog) => dialog.accept());
  await form.getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
  await expect(page.getByText('Đã xóa ảnh.')).toBeVisible();
  await expect(form.getByLabel('Ghi công ảnh')).toHaveValue('');
  await guestPage.reload();
  await expect(guestPage.locator('h1')).toHaveText('Dinh Độc Lập');
  await expect(guestPage.locator('.poi-photo')).toHaveCount(0);
  await guestPage.close();
});

test('Activity log tab lists the admin actions just performed, newest first, and skips rejected ones (extension C)', async ({ page, request }) => {
  const token = await login(page); // writes an auth.login entry
  const api = 'http://127.0.0.1:18082/api/v1/admin/categories';
  const headers = { Authorization: `Bearer ${token}` };
  const name = `Audit ${Date.now()}`;
  expect((await request.post(api, { headers, data: { name, name_en: `${name} en` } })).status()).toBe(201);
  expect((await request.post(api, { headers, data: { name, name_en: `${name} other` } })).status()).toBe(409); // duplicate: must not be logged
  await openTab(page, 'Nhật ký');
  const rows = page.locator('table.audit-table tbody tr');
  await expect(rows.first()).toContainText('Thêm danh mục');
  await expect(rows.first()).toContainText(name);
  await expect(rows.first()).toContainText('browser-admin');
  await expect(page.getByRole('cell', { name, exact: true })).toHaveCount(1);
  await expect(page.getByRole('row', { name: /Đăng nhập/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('cell', { name, exact: true })).toHaveCount(1);
  // The tab is kept in the URL like the other tabs, so a reload stays on it.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nhật ký thao tác' })).toBeVisible();
});
