import { expect, test } from '@playwright/test';

test('mobile drawer has complete keyboard and focus behavior', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/');
  const toggle = page.locator('.masthead-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'jcore-site-nav');
  await toggle.focus();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#jcore-site-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('mobile drawer closes after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/');
  const toggle = page.locator('.masthead-toggle');
  await toggle.click();
  await page.locator('#jcore-site-nav a', { hasText: 'About' }).click();
  await expect(page).toHaveURL(/\/JCORE\/en\/about\/$/);
  await expect(page.locator('.nav-drawer')).toBeHidden();
});

test('mobile hides the desktop station bar and theme state persists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/');
  await page.evaluate(() => localStorage.removeItem('jcore-theme'));
  await page.reload();
  await expect(page.locator('.station-bar')).toBeHidden();
  const toggle = page.locator('[data-theme-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});
