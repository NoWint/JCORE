import { expect, test } from '@playwright/test';

test('JCORE article page renders scholarly structure and citations', async ({ page }) => {
  await page.goto('/JCORE/en/articles/JCORE-2026-0001/');
  await expect(page.locator('.article-header .ownership-badge')).toContainText('JCORE Article');
  await expect(page.locator('.abstract-block')).toBeVisible();
  await expect(page.locator('.article-toc')).toBeVisible();
  await expect(page.locator('.citation-panel')).toContainText('BibTeX');
  await expect(page.locator('.article-prose')).toContainText('ChatMail Relay');
});

test('external article page labels source and rights', async ({ page }) => {
  await page.goto('/JCORE/en/articles/external/attention-is-all-you-need/');
  await expect(page.locator('.article-header .ownership-badge')).toContainText('External Open-Access Article');
  await expect(page.locator('.rights-panel')).toContainText('not published by JCORE');
  await expect(page.locator('.rights-panel')).toContainText('arXiv');
  await expect(page.locator('.article-prose')).toContainText('Transformer');
});

test('article toc points to rendered heading ids without visible math errors', async ({ page }) => {
  await page.goto('/JCORE/en/articles/external/flashattention-fast-memory-efficient-exact-attention-io-awareness/');
  const tocHref = await page.locator('.article-toc a').first().getAttribute('href');
  expect(tocHref).toBeTruthy();
  if (!tocHref) {
    throw new Error('Expected a table-of-contents anchor');
  }
  await expect(page.locator(tocHref)).toBeVisible();
  await expect(page.locator('.article-prose .katex-error')).toHaveCount(0);
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

test('wide paper tables stay readable inside a horizontal scroll container', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/external/attention-is-all-you-need/');
  await page.locator('#tab-wmt-results').scrollIntoViewIfNeeded();

  const tableState = await page.locator('#tab-wmt-results').evaluate((table) => {
    const container = table.parentElement;
    if (!container) {
      return null;
    }
    const firstValue = table.querySelector('tbody tr td:nth-child(2)');
    return {
      containerClass: container.className,
      containerClientWidth: container.clientWidth,
      containerScrollWidth: container.scrollWidth,
      tableScrollWidth: table.scrollWidth,
      firstValueWhiteSpace: firstValue
        ? getComputedStyle(firstValue).whiteSpace
        : null,
    };
  });

  expect(tableState).toEqual({
    containerClass: 'article-table-scroll',
    containerClientWidth: 358,
    containerScrollWidth: expect.any(Number),
    tableScrollWidth: expect.any(Number),
    firstValueWhiteSpace: 'normal',
  });
  expect(tableState?.containerScrollWidth).toBeGreaterThan(
    tableState?.containerClientWidth ?? 0,
  );
  expect(tableState?.tableScrollWidth).toBeGreaterThan(
    tableState?.containerClientWidth ?? 0,
  );
});
