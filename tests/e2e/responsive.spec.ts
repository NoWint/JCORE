import { expect, test } from '@playwright/test';

const routes = [
  '/JCORE/en/',
  '/JCORE/en/articles/',
  '/JCORE/en/articles/JCORE-2026-0001/',
  '/JCORE/en/articles/external/attention-is-all-you-need/',
  '/JCORE/en/issues/volume-1-issue-1/',
  '/JCORE/en/search/'
];

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 }
]) {
  test(`no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, route).toBeLessThanOrEqual(viewport.width);
    }
  });
}
