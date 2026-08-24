import { expect, test } from "@playwright/test";

test("mobile drawer has complete keyboard and focus behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/");
  const toggle = page.locator(".masthead-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", "jcore-site-nav");
  await toggle.focus();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#jcore-site-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("mobile drawer closes after navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/");
  const toggle = page.locator(".masthead-toggle");
  await toggle.click();
  await page.locator("#jcore-site-nav a", { hasText: "About" }).click();
  await expect(page).toHaveURL(/\/JCORE\/en\/about\/$/);
  await expect(page.locator(".nav-drawer")).toBeHidden();
});

test("desktop keeps the masthead centered and opens a fixed side panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/JCORE/en/articles/");
  const masthead = page.locator(".masthead");
  const toggle = page.locator(".masthead-toggle");
  const brand = page.locator(".masthead-brand");
  const actions = page.locator(".masthead-actions");

  await expect(toggle).toBeVisible();
  await expect(page.locator(".nav-drawer")).toBeHidden();
  const centers = await Promise.all(
    [masthead, brand].map(async (locator) => {
      const box = await locator.boundingBox();
      return box ? box.x + box.width / 2 : null;
    }),
  );
  expect(centers[0]).not.toBeNull();
  expect(centers[1]).not.toBeNull();
  expect(Math.abs((centers[0] ?? 0) - (centers[1] ?? 0))).toBeLessThanOrEqual(
    1,
  );

  const actionBox = await actions.boundingBox();
  const mastheadBox = await masthead.boundingBox();
  expect(actionBox).not.toBeNull();
  expect(mastheadBox).not.toBeNull();
  expect(actionBox?.x ?? 0).toBeGreaterThan((mastheadBox?.x ?? 0) + 700);

  await toggle.click();

  const drawer = page.locator(".nav-drawer");
  await expect(drawer).toBeVisible();
  await expect(page.locator(".nav-drawer-backdrop")).toBeVisible();
  await expect(drawer.locator(".nav-drawer-links")).toHaveCSS(
    "flex-direction",
    "column",
  );
  await expect(drawer).toHaveCSS("position", "fixed");
  expect(
    await drawer.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);

  await page
    .locator(".nav-drawer-backdrop")
    .click({ position: { x: 10, y: 10 } });
  await expect(drawer).toBeHidden();
});

test("drawer traps keyboard focus and keeps the toggle above the backdrop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/");

  const toggle = page.locator(".masthead-toggle");
  await toggle.click();
  const drawer = page.locator(".nav-drawer");
  const close = page.locator("[data-nav-close]");

  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".nav-drawer-links a").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  const toggleIsOnTop = await toggle.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return topElement === element || element.contains(topElement);
  });
  expect(toggleIsOnTop).toBe(true);
  await expect(drawer).toBeVisible();
});

test("resizing to desktop closes the mobile drawer and clears its state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/");
  await page.locator(".masthead-toggle").click();
  await expect(page.locator(".nav-drawer")).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.locator(".nav-drawer")).toBeHidden();
  await expect(page.locator(".nav-drawer-backdrop")).toBeHidden();
  await expect(page.locator(".masthead-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator("body")).not.toHaveClass(/nav-drawer-open/);
});

test("mobile hides the desktop station bar and theme state persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/");
  await page.evaluate(() => localStorage.removeItem("jcore-theme"));
  await page.reload();
  await expect(page.locator(".station-bar")).toBeHidden();
  const toggle = page.locator("[data-theme-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
  ).toBe("dark");
  await page.reload();
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
  ).toBe("dark");
});
