import { expect, test } from "@playwright/test";

test("JCORE article page renders scholarly structure and citations", async ({
  page,
}) => {
  await page.goto("/JCORE/en/articles/JCORE-2026-0001/");
  await expect(page.locator(".article-header .ownership-badge")).toContainText(
    "JCORE Article",
  );
  await expect(page.locator(".abstract-block")).toBeVisible();
  await expect(page.locator(".article-toc")).toBeVisible();
  await expect(page.locator(".citation-panel")).toContainText("BibTeX");
  await expect(page.locator(".article-prose")).toContainText("ChatMail Relay");
});

test("new first-issue papers render searchable full text and preserved source PDFs", async ({
  page,
  request,
}) => {
  await page.goto("/JCORE/en/articles/JCORE-2026-0003/");
  await expect(page.locator(".article-authors")).toContainText("Anonymous");
  await expect(page.locator(".article-prose")).toContainText(
    "False-Root Aging Theory",
  );
  await expect(page.locator(".article-prose")).toContainText("Hybrid Lease");
  await expect(page.locator(".article-prose")).not.toContainText("katex-error");
  await expect(page.locator(".source-files a")).toHaveAttribute(
    "href",
    /Safe_Conservative_GC_Theory\.pdf/,
  );

  await page.goto("/JCORE/en/articles/JCORE-2026-0004/");
  await expect(page.locator(".article-authors")).toContainText("Anonymous");
  await expect(page.locator(".article-prose")).toContainText(
    "Lazy Epoch Reset",
  );
  await expect(page.locator(".article-prose")).toContainText(
    "Defensive Re-verification Demotion",
  );

  const citation = await request.get("/JCORE/citations/JCORE-2026-0004.bib");
  expect(citation.ok()).toBe(true);
  expect(await citation.text()).toContain("@article{JCORE-2026-0004");
});

test("ChatMail article preserves the source language for each locale", async ({
  page,
}) => {
  await page.goto("/JCORE/en/articles/JCORE-2026-0001/");
  await expect(page.locator(".article-prose")).toContainText("What is this?");
  await expect(page.locator(".article-prose")).toContainText("Getting Started");

  await page.goto("/JCORE/zh/articles/JCORE-2026-0001/");
  await expect(page.locator(".article-prose")).toContainText("这是什么？");
  await expect(page.locator(".article-prose")).toContainText("快速开始");
});

test("external article page labels source and rights", async ({ page }) => {
  await page.goto("/JCORE/en/articles/external/attention-is-all-you-need/");
  await expect(page.locator(".article-header .ownership-badge")).toContainText(
    "External Open-Access Article",
  );
  await expect(page.locator(".rights-panel")).toContainText(
    "not published by JCORE",
  );
  await expect(page.locator(".rights-panel")).toContainText("arXiv");
  await expect(page.locator(".article-prose")).toContainText("Transformer");
});

test("article toc points to rendered heading ids without visible math errors", async ({
  page,
}) => {
  await page.goto(
    "/JCORE/en/articles/external/flashattention-fast-memory-efficient-exact-attention-io-awareness/",
  );
  const tocHref = await page
    .locator(".article-toc a")
    .first()
    .getAttribute("href");
  expect(tocHref).toBeTruthy();
  if (!tocHref) {
    throw new Error("Expected a table-of-contents anchor");
  }
  await expect(page.locator(tocHref)).toBeVisible();
  await expect(page.locator(".article-prose .katex-error")).toHaveCount(0);
});

test("citation endpoints return downloadable text", async ({
  page,
  request,
}) => {
  await page.goto("/JCORE/en/articles/JCORE-2026-0001/");
  const response = await request.get("/JCORE/citations/JCORE-2026-0001.bib");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("@article{JCORE-2026-0001");
});

test("article pages have no horizontal overflow on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/external/deepseek-v3-technical-report/");
  await page.waitForLoadState("networkidle");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("wide paper tables stay readable inside a horizontal scroll container", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/JCORE/en/articles/external/attention-is-all-you-need/");
  await page.locator("#tab-wmt-results").scrollIntoViewIfNeeded();

  const tableState = await page
    .locator("#tab-wmt-results")
    .evaluate((table) => {
      const container = table.parentElement;
      if (!container) {
        return null;
      }
      const firstValue = table.querySelector("tbody tr td:nth-child(2)");
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
    containerClass: "article-table-scroll",
    containerClientWidth: 358,
    containerScrollWidth: expect.any(Number),
    tableScrollWidth: expect.any(Number),
    firstValueWhiteSpace: "normal",
  });
  expect(tableState?.containerScrollWidth).toBeGreaterThan(
    tableState?.containerClientWidth ?? 0,
  );
  expect(tableState?.tableScrollWidth).toBeGreaterThan(
    tableState?.containerClientWidth ?? 0,
  );
});

test("article reader controls adjust typography and persist focus mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("jcore-reader-test-reset")) {
      localStorage.removeItem("jcore-reader-settings");
      sessionStorage.setItem("jcore-reader-test-reset", "true");
    }
  });
  await page.goto("/JCORE/en/articles/JCORE-2026-0001/");

  const prose = page.locator(".article-prose");
  const readerToggle = page.locator("[data-reader-toggle]");
  const readerPanel = page.locator("[data-reader-panel]");
  await expect(readerToggle).toBeVisible();

  const togglePosition = await readerToggle.boundingBox();
  const titlePosition = await page.locator(".article-title").boundingBox();
  expect(togglePosition?.y ?? Infinity).toBeLessThan(titlePosition?.y ?? -1);
  const controlsWidth = await page
    .locator("[data-reader-controls]")
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(controlsWidth).toBeLessThanOrEqual(
    await page
      .locator(".article-page")
      .evaluate((element) => element.getBoundingClientRect().width),
  );
  await expect(readerPanel).toBeHidden();
  await readerToggle.click();
  await expect(readerPanel).toBeVisible();

  const initialTypography = await prose.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
    };
  });

  await page.locator('[data-reader-font-size="large"]').click();
  await page.locator('[data-reader-letter-spacing="wide"]').click();
  await page.locator('[data-reader-line-height="loose"]').click();
  await page.locator('[data-reader-weight="medium"]').click();
  await page.locator('[data-reader-content-width="wide"]').click();
  await page.locator('[data-reader-paragraph-spacing="loose"]').click();

  const adjustedTypography = await prose.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
    };
  });

  expect(adjustedTypography.fontSize).not.toBe(initialTypography.fontSize);
  expect(adjustedTypography.letterSpacing).not.toBe(
    initialTypography.letterSpacing,
  );
  expect(adjustedTypography.lineHeight).not.toBe(initialTypography.lineHeight);
  expect(adjustedTypography.fontWeight).not.toBe(initialTypography.fontWeight);

  const adjustedLayout = await page
    .locator(".article-prose")
    .evaluate((element) => {
      const paragraph = element.querySelector("p");
      return {
        width: element.getBoundingClientRect().width,
        paragraphMargin: paragraph
          ? getComputedStyle(paragraph).marginBottom
          : null,
      };
    });
  expect(adjustedLayout.paragraphMargin).toBe("32px");

  const focusToggle = page.locator("[data-reader-focus-toggle]");
  await focusToggle.check();
  await expect(page.locator(".article-page")).toHaveClass(/reader-focus/);
  await expect(page.locator(".page-main")).toHaveClass(/is-article/);

  const focusedWidth = await page
    .locator(".article-prose")
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(focusedWidth).toBeGreaterThan(adjustedLayout.width);

  await page.reload();
  await expect(page.locator("[data-reader-focus-toggle]")).toBeChecked();
  await expect(page.locator(".article-page")).toHaveClass(/reader-focus/);

  await page.locator("[data-reader-toggle]").click();
  await page.locator("[data-reader-reset]").click();
  await expect(page.locator("[data-reader-focus-toggle]")).not.toBeChecked();
  await expect(page.locator(".article-page")).not.toHaveClass(/reader-focus/);
});
