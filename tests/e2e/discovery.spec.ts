import { expect, test } from '@playwright/test';

test('home and discovery surfaces show JCORE and external ownership', async ({ page }) => {
  await page.goto('/JCORE/en/');
  await expect(page.locator('.journal-title')).toHaveText('JCORE');
  await expect(page.locator('.issue-banner')).toContainText('Volume 1, Issue 1');
  await expect(page.locator('.article-card').first()).toBeVisible();

  await page.goto('/JCORE/en/articles/');
  await expect(page.locator('.ownership-badge.is-external').first()).toBeVisible();
  await expect(page.locator('.ownership-badge:not(.is-external)').first()).toBeVisible();

  await page.goto('/JCORE/en/issues/volume-1-issue-1/');
  await expect(page.locator('.article-card')).toHaveCount(2);

  await page.goto('/JCORE/zh/authors/demo-author-002/');
  await expect(page.locator('main h1')).toContainText('张米娜');
  await expect(page.locator('.article-card')).toHaveCount(2);
});

test('discovery pages have no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
