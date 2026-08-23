import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/JCORE/en/',
  '/JCORE/en/articles/JCORE-2026-0001/',
  '/JCORE/zh/policies/'
];

for (const route of pages) {
  test(`no serious axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious).toEqual([]);
  });
}
