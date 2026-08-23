import { expect, test } from '@playwright/test';

test('English search finds external and JCORE articles', async ({ page }) => {
  await page.goto('/JCORE/en/search/');
  await page.locator('[data-search-input]').fill('Attention');
  await page.waitForSelector('.search-result', { timeout: 15000 });
  await expect(page.locator('.search-result a').first()).toContainText('Attention');
});

test('Chinese search interface returns scholarly results', async ({ page }) => {
  await page.goto('/JCORE/zh/search/');
  await page.locator('[data-search-input]').fill('DeepSeek');
  await page.waitForSelector('.search-result', { timeout: 15000 });
  await expect(page.locator('.search-result a').first()).toContainText('DeepSeek-V3');
});
