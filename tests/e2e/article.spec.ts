import { expect, test } from '@playwright/test';

test('JCORE article page renders scholarly structure and citations', async ({ page }) => {
  await page.goto('/JCORE/en/articles/JCORE-2026-0001/');
  await expect(page.locator('.article-header .ownership-badge')).toContainText('JCORE Article');
  await expect(page.locator('.article-header .ownership-badge')).toContainText('Demonstration');
  await expect(page.locator('.abstract-block')).toBeVisible();
  await expect(page.locator('.article-toc')).toBeVisible();
  await expect(page.locator('.citation-panel')).toContainText('BibTeX');
  await expect(page.locator('.article-prose')).toContainText('Transformer');
});

test('external article page labels source and rights', async ({ page }) => {
  await page.goto('/JCORE/en/articles/external/attention-is-all-you-need/');
  await expect(page.locator('.article-header .ownership-badge')).toContainText('External Open-Access Article');
  await expect(page.locator('.rights-panel')).toContainText('not published by JCORE');
  await expect(page.locator('.rights-panel')).toContainText('arXiv');
  await expect(page.locator('.article-prose')).toContainText('Transformer');
});

test('citation endpoints return downloadable text', async ({ page, request }) => {
  await page.goto('/JCORE/en/articles/JCORE-2026-0001/');
  const response = await request.get('/JCORE/citations/JCORE-2026-0001.bib');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('@article{JCORE-2026-0001');
});

test('article pages have no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/external/deepseek-v3-technical-report/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
