import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:18175';
const guest = 'http://127.0.0.1:18174';

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

test('Admin category CRUD, NFC duplicates, validation, used category and translated controls', async ({ page }) => {
  await login(page);
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
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser test place' })).toContainText('draft');
  await expect(page.getByText('Đã lưu thành công.')).toBeVisible();

  await form.getByLabel('Tên').fill('Browser edited place');
  await form.getByLabel('Bán kính (m)').fill('1000');
  await form.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser edited place' })).toContainText('draft');

  const narr = page.locator('.places .place-form').last();
  await narr.getByLabel('Mã ngôn ngữ').fill('fr');
  await narr.getByLabel('Tiêu đề').fill('Titre de test');
  await narr.getByLabel('Nội dung').fill('Texte saisi par le test');
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'fr · Titre de test' })).toBeVisible();

  await narr.getByLabel('Mã ngôn ngữ').fill('FR');
  await narr.getByLabel('Tiêu đề').fill('Duplicate');
  await narr.getByLabel('Nội dung').fill('Duplicate');
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places [role="alert"]')).toContainText('Ngôn ngữ này đã có bài');
  await page.locator('.places').getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.locator('.places li').filter({ hasText: 'fr · Titre de test' }).getByRole('button', { name: 'Sửa', exact: true }).click();
  await expect(narr.getByLabel('Mã ngôn ngữ')).toBeDisabled();
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
