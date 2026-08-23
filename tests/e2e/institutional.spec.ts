import { expect, test } from '@playwright/test';

test('root redirects to the English journal by default', async ({ page }) => {
  await page.goto('/JCORE/');
  await expect(page).toHaveURL(/\/JCORE\/en\/$/);
  await expect(page.locator('.journal-title')).toHaveText('JCORE');
});

test('bilingual institutional pages render', async ({ page }) => {
  await page.goto('/JCORE/en/about/');
  await expect(page).toHaveTitle(/About/);
  await expect(page.locator('.site-header')).toContainText('JCORE');

  await page.goto('/JCORE/zh/submit/');
  await expect(page.locator('.notice')).toContainText('投稿尚未开放');

  await page.goto('/JCORE/en/editorial-board/');
  await expect(page.locator('.notice')).toContainText('Demonstration');

  await page.goto('/JCORE/zh/policies/');
  await expect(page.locator('main h1')).toContainText('政策');
});

test('institutional pages have no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/about/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
