import { test, expect } from '@playwright/test';

const admin = 'http://127.0.0.1:18175';
const guest = 'http://127.0.0.1:18174';

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
  await form.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser test place' })).toContainText('draft');
  await expect(page.getByText('Đã lưu thành công.')).toBeVisible();

  const narr = page.locator('.places .place-form').last();
  await narr.getByLabel('Mã ngôn ngữ').fill('fr');
  await narr.getByLabel('Tiêu đề').fill('Titre de test');
  await narr.getByLabel('Nội dung').fill('Texte saisi par le test');
  await narr.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'fr · Titre de test' })).toBeVisible();

  const guestPage = await page.context().newPage();
  await guestPage.goto(guest);
  await expect(guestPage.locator('.card')).toHaveCount(2);
  await expect(guestPage.getByText('Browser test place')).toHaveCount(0);
  await guestPage.close();

  page.once('dialog', dialog => dialog.accept());
  await form.getByRole('button', { name: 'Xóa' }).click();
  await expect(page.locator('.places .category-list li').filter({ hasText: 'Browser test place' })).toHaveCount(0);
  const pois = await request.get('http://127.0.0.1:18082/api/v1/pois');
  expect((await pois.json()).items).toHaveLength(2);
  expect(errors).toEqual([]);
});
