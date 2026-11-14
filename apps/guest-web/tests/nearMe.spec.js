import { test, expect } from '@playwright/test';

// Phần B "Gần tôi" trên web khách, chạy với dữ liệu giả lập (cổng 18173): 5 địa điểm có tọa độ cố định.
// Vị trí giả của khách gần Chợ Bến Thành; khoảng cách tính bằng haversine độc lập: chợ 56 m, Dinh Độc Lập 534 m,
// Nhà hát 695 m, Nhà thờ Đức Bà 764 m, Bưu điện 792 m.
const mock = 'http://127.0.0.1:18173';
const AT_MARKET = { latitude: 10.773, longitude: 106.698 };
const ORIGINAL = ['Dinh Độc Lập', 'Nhà thờ Đức Bà', 'Bưu điện Trung tâm', 'Chợ Bến Thành', 'Nhà hát Thành phố'];
const NEAREST_FIRST = ['Chợ Bến Thành', 'Dinh Độc Lập', 'Nhà hát Thành phố', 'Nhà thờ Đức Bà', 'Bưu điện Trung tâm'];

const names = (page) => page.locator('.card h3').allTextContents();
const nearMeButton = (page, name = 'Gần tôi') => page.getByRole('button', { name, exact: true });
const watchRequests = (page) => {
  const sent = [];
  page.on('request', (request) => sent.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  return sent;
};
// Khớp đúng dạng thập phân của tọa độ giả (10.773 / 106.698, kể cả đã mã hóa %2E), tránh nhầm với mã băm trong URL của Vite.
const leaksCoordinates = (sent) => sent.filter((line) => /10(\.|%2E)773|106(\.|%2E)698|[?&](lat|lon|latitude|longitude)=/i.test(line));

test.describe('đã cho phép vị trí', () => {
  test.use({ geolocation: AT_MARKET, permissions: ['geolocation'] });

  test('sắp theo khoảng cách, hiện khoảng cách, không gửi tọa độ đi đâu và không lưu vào trình duyệt', async ({ page }) => {
    const sent = watchRequests(page);
    await page.goto(mock);
    await expect(page.locator('.card')).toHaveCount(5);
    expect(await names(page)).toEqual(ORIGINAL);
    await expect(page.locator('.tag.distance')).toHaveCount(0);

    await nearMeButton(page).click();
    await expect(nearMeButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.near-me .muted')).toContainText('không gửi đi');
    expect(await names(page)).toEqual(NEAREST_FIRST);

    const badges = page.locator('.tag.distance');
    await expect(badges).toHaveCount(5);
    await expect(badges.first()).toHaveText('~60 m');
    await expect(badges.first()).toHaveAttribute('aria-label', 'Cách bạn ~60 m');
    await expect(badges.last()).toHaveText('~790 m');

    // BR07: không request nào chứa tọa độ; chế độ giả lập không gọi /api; không ghi vào bộ nhớ trình duyệt.
    expect(leaksCoordinates(sent)).toEqual([]);
    expect(sent.filter((line) => new URL(line.split(' ')[1]).pathname.startsWith('/api/'))).toEqual([]);
    const stored = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie]));
    expect(stored).not.toMatch(/10\.773|106\.698/);
  });

  test('bấm lại để tắt: trở về thứ tự cũ và bỏ khoảng cách', async ({ page }) => {
    await page.goto(mock);
    await expect(page.locator('.card')).toHaveCount(5);
    await nearMeButton(page).click();
    await expect(page.locator('.tag.distance')).toHaveCount(5);
    await nearMeButton(page).click();
    await expect(nearMeButton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.tag.distance')).toHaveCount(0);
    expect(await names(page)).toEqual(ORIGINAL);
  });

  test('kết hợp với tìm kiếm: chỉ còn kết quả khớp và vẫn sắp theo khoảng cách', async ({ page }) => {
    await page.goto(mock);
    await expect(page.locator('.card')).toHaveCount(5);
    await nearMeButton(page).click();
    await expect(page.locator('.tag.distance')).toHaveCount(5);
    await page.getByRole('searchbox').fill('Nhà');
    await expect(page.locator('.card')).toHaveCount(2);
    expect(await names(page)).toEqual(['Nhà hát Thành phố', 'Nhà thờ Đức Bà']);
    await expect(page.locator('.tag.distance')).toHaveCount(2);
  });

  test('giao diện tiếng Anh dùng nhãn và câu đọc tiếng Anh', async ({ page }) => {
    await page.goto(mock);
    await page.getByLabel('Ngôn ngữ giao diện').selectOption('en');
    await expect(page.locator('.card')).toHaveCount(5);
    await nearMeButton(page, 'Near me').click();
    await expect(nearMeButton(page, 'Near me')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.tag.distance').first()).toHaveAttribute('aria-label', '~60 m from you');
  });
});

test.describe('chưa cho phép vị trí', () => {
  test.use({ permissions: [] });

  test('báo lý do, giữ thứ tự cũ và không hiện khoảng cách', async ({ page }) => {
    await page.goto(mock);
    await expect(page.locator('.card')).toHaveCount(5);
    await nearMeButton(page).click();
    await expect(page.getByRole('alert')).toContainText('chưa cho phép');
    await expect(nearMeButton(page)).toHaveAttribute('aria-pressed', 'false');
    expect(await names(page)).toEqual(ORIGINAL);
    await expect(page.locator('.tag.distance')).toHaveCount(0);
  });
});
