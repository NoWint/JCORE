# JCORE Publication Pipeline and Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the eight-paper JCORE corpus across desktop, tablet, and 390px mobile while delivering a deterministic CLI that imports PDF, LaTeX, JATS XML, Markdown, and recorded DOI sources into validated structured bundles or explicit source-fallback records.

**Architecture:** Keep Astro static generation and the existing content repository, but make article rendering a typed pipeline with normalization, structural indexing, Markdown/KaTeX rendering, post-processing, sanitization, and a render report. Extend the existing import adapters behind one CLI boundary; every import emits a reviewable staging bundle that either contains canonical Markdown or preserves the original source and diagnostics. Article pages consume the render report and display a first-class fallback view when structured conversion is unavailable.

**Tech Stack:** Astro 7, TypeScript, unified/remark/rehype, KaTeX, Zod, Vitest, Playwright, Node.js `tsx`, existing YAML/gray-matter/XML/tar dependencies, optional system `pandoc` and `pdftotext`.

## Global Constraints

- The public site remains a bilingual Astro static site; this phase adds no database, login system, online submission workflow, review backend, or DOI registration.
- Every article bundle contains `index.md`, `body.md` when structured content exists, `import-report.json`, `source/` when redistribution is allowed, and `assets/`.
- `renderMode` is exactly `structured | source-fallback`; fallback records remain valid public records and never pretend to contain fully rendered full text.
- Supported source formats are exactly `pdf | latex | jats | markdown | doi`; DOI discovery is an explicit network operation and never runs during normal validation, builds, or tests.
- The CLI command is exposed as `npm run jcore -- ...` with `inspect`, `import`, `validate`, `promote`, and `report` subcommands.
- Imports are deterministic, atomic, reviewable in Git, and refuse accidental overwrite by default.
- Fatal diagnostics fail validation/build; warnings are preserved in `import-report.json` and shown to operators.
- Raw HTML is restricted to the scientific subset required by the corpus; scripts, event handlers, unsafe URLs, and unrelated embeds are removed.
- Explicit source IDs are preserved when valid; duplicate IDs receive deterministic suffixes; unresolved internal references remain readable text without a broken `href`.
- Display math is isolated as block math, unsupported math is escaped as readable source text, and rendered article HTML must not contain visible `.katex-error`.
- Article media stays inside the content column and no tested route may exceed the viewport width at 390px, 768px, or desktop width.
- New behavior follows TDD: write a focused failing test, run it to observe the expected failure, implement the smallest change, then run the covering test again before refactoring.
- Existing uncommitted edits in `src/layouts/SiteLayout.astro` and `src/lib/article/render.ts` are retained and integrated.

## File Map

Create or modify only the following responsibilities unless a test failure proves another file is required:

- `src/lib/article/types.ts`: typed render modes, indexed headings, media references, and render diagnostics.
- `src/lib/article/normalize.ts`: Pandoc/LaTeX/JATS artifact cleanup, math isolation, table normalization, and safe source-label extraction.
- `src/lib/article/index.ts`: structural index and deterministic ID/reference map.
- `src/lib/article/render.ts`: public renderer facade returning HTML and a render report.
- `src/lib/article/quality.ts`: article HTML quality checks used by content validation and tests.
- `src/lib/content/contracts.ts`, `src/lib/content/types.ts`: representation metadata and source-file contracts.
- `scripts/validate/content.ts`, `scripts/validate/publication.ts`: fallback-aware content loading and publication rules.
- `scripts/import/types.ts`, `scripts/import/manifest.ts`, `scripts/import/run-import.ts`, `scripts/import/emit.ts`, `scripts/import/writer.ts`: unified import lifecycle and source preservation.
- `scripts/import/adapters/pdf.ts`, `scripts/import/adapters/markdown.ts`: PDF fallback/optional text conversion and Markdown conversion.
- `scripts/import/source-discovery.ts`, `scripts/import/registry.ts`: input detection, checksums, and conflict handling.
- `scripts/import/cli.ts`, `scripts/jcore.ts`: command-line interface and exit-code behavior.
- `src/layouts/ArticleLayout.astro`, `src/pages/[lang]/articles/[articleId].astro`, `src/pages/[lang]/articles/external/[slug].astro`: structured/fallback article views and render-report consumption.
- `src/components/site/SiteHeader.astro`, `src/styles/global.css`, `src/styles/typography.css`: accessible navigation, theme behavior, and responsive article/media layout.
- `tests/unit/article-render.test.ts`, `tests/unit/import-cli.test.ts`, `tests/unit/content-contracts.test.ts`: focused red-green coverage.
- `tests/contract/article-render-corpus.test.ts`, `tests/contract/import-fallback.test.ts`, `tests/contract/built-site.test.ts`: corpus and generated-artifact contracts.
- `tests/e2e/article.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/accessibility.spec.ts`, `tests/e2e/header.spec.ts`: browser acceptance at desktop, 768px, and 390px.
- `content/articles/*/index.md`, `content/external-articles/*/index.md`, `docs/importing.md`, `README.md`: explicit representation metadata and operator documentation.

---

### Task 1: Build the Typed Article Render Pipeline

**Files:**
- Create: `src/lib/article/types.ts`
- Create: `src/lib/article/normalize.ts`
- Create: `src/lib/article/index.ts`
- Modify: `src/lib/article/render.ts`
- Test: `tests/unit/article-render.test.ts`

**Interfaces:**
- `normalizeArticleBody(markdown: string): { markdown: string; diagnostics: Diagnostic[] }`
- `indexArticleBody(markdown: string): ArticleStructure`
- `renderArticleBody(markdown: string, base?: string): Promise<string>` remains available for existing callers.
- `renderArticle(markdown: string, options?: { base?: string }): Promise<ArticleRenderReport>` becomes the preferred route API.
- `ArticleRenderReport` contains `html`, `headings`, `media`, and `diagnostics`.

- [ ] **Step 1: Write failing renderer tests**

Add tests that use real Markdown strings and assert:

```ts
it('keeps explicit heading labels and uses the same ids for the toc index', async () => {
  const report = await renderArticle('# Methods {#sec:methods}\n\n## Setup', { base: '/JCORE' });
  expect(report.headings.map((heading) => heading.id)).toEqual(['sec-methods', 'setup']);
  expect(report.html).toContain('<h1 id="sec-methods">Methods</h1>');
});

it('does not emit Pandoc fences, KaTeX error markup, or broken internal hrefs', async () => {
  const report = await renderArticle(
    '::: algorithmic\n\n## Algorithm {#alg:one}\n\n$$\n\\begin{equation*}x=1\\end{equation*}\n$$\n\nSee [Algorithm](#alg:missing).',
  );
  expect(report.html).not.toContain(':::');
  expect(report.html).not.toContain('katex-error');
  expect(report.html).not.toContain('href="#alg:missing"');
  expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain('unresolved-reference');
});

it('converts simple whitespace tables and records media references', async () => {
  const report = await renderArticle(
    'Name  Score\n-----  -----\nAlice  9\n\n![Latency](/figures/paper/chart.pdf)',
    { base: '/JCORE' },
  );
  expect(report.html).toContain('<table>');
  expect(report.html).toContain('/JCORE/figures/paper/chart.pdf');
  expect(report.media).toEqual([{ src: '/JCORE/figures/paper/chart.pdf', kind: 'image' }]);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npx vitest run tests/unit/article-render.test.ts
```

Expected: FAIL because `renderArticle`, `ArticleRenderReport`, and the normalized ID/reference behavior do not yet exist.

- [ ] **Step 3: Implement normalization and structural indexing**

Move the current cleanup logic into `normalize.ts` and extend it to:

```ts
export interface ArticleStructure {
  headings: Heading[];
  ids: Set<string>;
  references: Array<{ target: string; source: string }>;
}

export function indexArticleBody(markdown: string): ArticleStructure
```

Normalize heading attributes such as `{#sec:methods}` into source IDs, preserve inner content from every Pandoc `:::` block, isolate `equation`, `equation*`, `align`, and `align*` as `$$` blocks, convert only recognized simple tables, and retain unsupported constructs as readable text plus warnings. Use a deterministic `slugify` and deterministic `-2`, `-3` suffixes for duplicate IDs.

- [ ] **Step 4: Implement render post-processing**

Use the existing unified plugins, but add:

```ts
export interface ArticleRenderOptions {
  base?: string;
}

export interface ArticleRenderReport {
  html: string;
  headings: Heading[];
  media: MediaReference[];
  diagnostics: Diagnostic[];
}

export async function renderArticle(
  markdown: string,
  options?: ArticleRenderOptions,
): Promise<ArticleRenderReport>
```

Rewrite only internal references that resolve to indexed IDs, remove `href` from unresolved references while preserving their label, add IDs from the same index used by the TOC, prefix local `/figures/` paths with the configured site base, and collect image/embed/video sources without allowing them to escape the article root.

- [ ] **Step 5: Run the focused test to verify GREEN and refactor**

Run:

```bash
npx vitest run tests/unit/article-render.test.ts
```

Expected: PASS with no test warnings. Refactor only after the test is green; keep `renderArticleBody` as a compatibility wrapper returning `report.html`.

- [ ] **Step 6: Commit the render pipeline**

```bash
git add src/lib/article tests/unit/article-render.test.ts
git commit -m "feat: add indexed article rendering pipeline"
```

### Task 2: Add Render Quality Validation for the Full Corpus

**Files:**
- Create: `src/lib/article/quality.ts`
- Create: `tests/contract/article-render-corpus.test.ts`
- Modify: `scripts/validate/content.ts`
- Modify: `scripts/validate/built-site.ts`

**Interfaces:**
- `validateRenderedArticle(report: ArticleRenderReport, sourcePath: string): Diagnostic[]`
- `validateArticleCorpus(index: CollectionIndex, base: string): Promise<Diagnostic[]>`

- [ ] **Step 1: Write failing corpus quality tests**

Add a contract test that loads the repository and renders all two JCORE and six external records. For every report assert zero error diagnostics and assert:

```ts
expect(report.html).not.toMatch(/:::\s|reference-type=|class="katex-error"/);
expect(new Set([...report.html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])).size)
  .toBe([...report.html.matchAll(/\sid="([^"]+)"/g)].length);
```

Also assert every `href="#id"` target exists and every `/figures/` source maps to an existing file under `public/`.

- [ ] **Step 2: Run the corpus test to verify RED**

Run:

```bash
npx vitest run tests/contract/article-render-corpus.test.ts
```

Expected: FAIL with the current FlashAttention/DeepSeek KaTeX and source-artifact diagnostics.

- [ ] **Step 3: Implement quality checks**

Parse report HTML with `cheerio`, detect visible source artifacts, duplicate IDs, `.katex-error`, unresolved local media, broken internal anchors, and source-fallback violations. Emit structured diagnostics with the existing `makeDiagnostic` helper; warnings are allowed only for intentionally unsupported math that has escaped readable text.

- [ ] **Step 4: Integrate validation without making Astro render twice**

Update `loadContent` and `validateBuiltSite` so command-line content validation can run the quality pass before a build, while Astro routes reuse the report generated for the page. Keep the existing publication relationship checks unchanged.

- [ ] **Step 5: Run focused and existing contract tests**

Run:

```bash
npx vitest run tests/contract/article-render-corpus.test.ts tests/contract/publication-validator.test.ts
```

Expected: PASS with no fatal render diagnostics.

- [ ] **Step 6: Commit corpus quality validation**

```bash
git add src/lib/article/quality.ts scripts/validate/content.ts scripts/validate/built-site.ts tests/contract/article-render-corpus.test.ts
git commit -m "test: validate rendered article corpus"
```

### Task 3: Extend Content Contracts for Structured and Source-Fallback Records

**Files:**
- Modify: `src/lib/content/contracts.ts`
- Modify: `src/lib/content/types.ts`
- Modify: `scripts/validate/content.ts`
- Modify: `scripts/validate/publication.ts`
- Modify: `tests/unit/content-contracts.test.ts`
- Modify: `content/articles/*/index.md`
- Modify: `content/external-articles/*/index.md`

**Interfaces:**
- `RenderMode = 'structured' | 'source-fallback'`
- `SourceFormat = 'pdf' | 'latex' | 'jats' | 'markdown' | 'doi' | 'manual'`
- `SourceFile` has `path`, `label`, and `kind: 'source' | 'pdf' | 'supplementary'`.
- `ConversionInfo` has `status: 'converted' | 'fallback'`, `importer`, `outputChecksum`, and `reportPath`.

- [ ] **Step 1: Write failing contract tests**

Add tests that:

```ts
it('accepts an explicit structured representation', () => {
  const result = articleMetadataSchema.safeParse({
    ...validArticle,
    renderMode: 'structured',
    sourceFormat: 'manual',
    conversion: {
      status: 'converted',
      importer: 'manual',
      outputChecksum: 'a'.repeat(64),
      reportPath: 'import-report.json',
    },
  });
  expect(result.success).toBe(true);
});

it('accepts a source fallback without body text when a source file and diagnostic exist', () => {
  const result = externalArticleMetadataSchema.safeParse({
    ...validExternalArticle,
    renderMode: 'source-fallback',
    sourceFormat: 'pdf',
    sourceFiles: [{ path: '/sources/example/paper.pdf', label: 'Original PDF', kind: 'pdf' }],
    conversion: {
      status: 'fallback',
      importer: 'jcore@0.1.0',
      outputChecksum: 'b'.repeat(64),
      reportPath: 'import-report.json',
    },
  });
  expect(result.success).toBe(true);
});
```

- [ ] **Step 2: Run the contract tests to verify RED**

Run:

```bash
npx vitest run tests/unit/content-contracts.test.ts
```

Expected: FAIL because representation fields are not in the current strict schemas.

- [ ] **Step 3: Implement the representation schemas**

Add shared schemas with defaults of `renderMode: 'structured'`, `sourceFormat: 'manual'`, and `sourceFiles: []` so existing authored content can migrate deterministically. Allow `body.md` to be absent only when `renderMode` is `source-fallback`; keep structured records requiring non-empty bodies.

- [ ] **Step 4: Make content loading and publication validation fallback-aware**

Update `loadMarkdown` to return an empty body for fallback records only, and update publication validation to require:

```ts
record.renderMode === 'source-fallback'
  ? record.sourceFiles.length > 0 && record.conversion.status === 'fallback'
  : record.body.trim().length > 0 && record.conversion.status === 'converted'
```

Reject fallback records without source provenance or a persisted diagnostic report. Preserve the current rights gate for external full text and source files.

- [ ] **Step 5: Migrate all eight metadata files**

Add explicit representation fields to the two JCORE records and six external records. Mark the current eight normalized bodies as `structured`, preserve their existing source format/provenance, and point `conversion.reportPath` at a checked-in `import-report.json` only when one exists; otherwise use the deterministic manual importer marker. Do not change titles, authors, rights, dates, or identifiers.

- [ ] **Step 6: Run unit and content validation**

Run:

```bash
npx vitest run tests/unit/content-contracts.test.ts tests/contract/demo-corpus.test.ts tests/contract/external-corpus.test.ts
tsx scripts/validate/content.ts
```

Expected: PASS with zero error diagnostics.

- [ ] **Step 7: Commit the content contract**

```bash
git add src/lib/content scripts/validate/content.ts scripts/validate/publication.ts tests/unit/content-contracts.test.ts content
git commit -m "feat: model structured and source fallback articles"
```

### Task 4: Implement the Unified Import CLI and Source Preservation

**Files:**
- Modify: `scripts/import/types.ts`
- Modify: `scripts/import/manifest.ts`
- Modify: `scripts/import/source-discovery.ts`
- Modify: `scripts/import/run-import.ts`
- Modify: `scripts/import/emit.ts`
- Modify: `scripts/import/writer.ts`
- Create: `scripts/import/adapters/markdown.ts`
- Create: `scripts/import/adapters/pdf.ts`
- Create: `scripts/import/cli.ts`
- Create: `scripts/jcore.ts`
- Create: `tests/unit/import-cli.test.ts`
- Create: `tests/contract/import-fallback.test.ts`
- Modify: `package.json`

**Interfaces:**
- `ImportSourceType = 'pdf' | 'latex' | 'jats' | 'markdown' | 'doi'`
- `detectSourceType(inputPath: string): Promise<ImportSourceType>`
- `runCli(argv: string[], io?: CliIo): Promise<number>`
- `emitFallbackImport(report: ImportReport, source: ImportSource, staging: StagingArea, targetRoot: string): Promise<ImportArtifacts>`

- [ ] **Step 1: Write failing CLI and fallback tests**

Use temporary directories and real fixture bytes to assert:

```ts
it('detects PDF and Markdown inputs', async () => {
  expect(await detectSourceType('/tmp/paper.pdf')).toBe('pdf');
  expect(await detectSourceType('/tmp/body.md')).toBe('markdown');
});

it('preserves the original source when PDF conversion is unavailable', async () => {
  const code = await runCli(['import', 'paper.pdf', '--manifest', 'manifest.yaml', '--staging', stagingRoot]);
  expect(code).toBe(0);
  expect(await readFile(join(stagingRoot, 'paper', 'import-report.json'), 'utf8')).toContain('"renderMode": "source-fallback"');
  expect(existsSync(join(stagingRoot, 'paper', 'source', 'paper.pdf'))).toBe(true);
});

it('refuses promotion over an existing record', async () => {
  await expect(promoteRecord(stagingRecord, existingTarget)).rejects.toThrow(/already exists/);
});
```

- [ ] **Step 2: Run focused CLI tests to verify RED**

Run:

```bash
npx vitest run tests/unit/import-cli.test.ts tests/contract/import-fallback.test.ts
```

Expected: FAIL because the CLI, source-type detector, Markdown/PDF adapters, and fallback emitter do not exist.

- [ ] **Step 3: Extend manifests, reports, and import types**

Allow `sourceType` values `pdf` and `markdown`; add `renderMode`, `sourceFormat`, `sourceFiles`, and conversion information to normalized output and serialized reports. Preserve original source bytes in deterministic path order and include SHA-256 checksums for the package and emitted body/assets.

- [ ] **Step 4: Add Markdown and PDF adapters**

The Markdown adapter reads a file or article directory, normalizes `body.md`, and returns structured output. The PDF adapter attempts `pdftotext -layout` only when the executable is available and the extracted text passes the renderer quality preflight; otherwise it returns a non-fatal conversion diagnostic that causes a source-fallback record. Never discard the original PDF. Treat missing or unsafe PDFs as fallback with an error diagnostic retained in the report.

- [ ] **Step 5: Add source detection and the CLI command dispatcher**

Implement:

```text
npm run jcore -- inspect <input> [--json]
npm run jcore -- import <input> --manifest <file> [--staging <dir>]
npm run jcore -- validate <path>
npm run jcore -- promote <staged-record> [--content-root <dir>] [--public-root <dir>]
npm run jcore -- report <record> [--json]
```

`inspect` reports detected type, package files, checksum, root candidates, rights/provenance gaps, and converter availability. `import` writes an atomic staging bundle and returns exit code `0` for both structured and acknowledged fallback output; malformed manifests and unsafe sources return non-zero. `validate` refuses fatal diagnostics, `promote` requires a successful structured validation or an explicit fallback record, and `report` prints stable human-readable diagnostics or JSON.

- [ ] **Step 6: Preserve sources and expose promotion paths**

Update the staging writer to copy source files under `source/`, normalized media under `assets/`, and a public mirror under `public/sources/<slug>/` during promotion. Generated metadata uses `/sources/<slug>/...` URLs, and the operation refuses overwrite unless `--force` is explicitly passed. Ensure temporary directories are cleaned on failures.

- [ ] **Step 7: Add the npm script and run CLI tests**

Add `"jcore": "tsx scripts/jcore.ts"` to `package.json`, then run:

```bash
npx vitest run tests/unit/import-cli.test.ts tests/contract/import-fallback.test.ts tests/contract/import-determinism.test.ts
npm run jcore -- inspect tests/fixtures/import/latex/valid
npm run jcore -- --help
```

Expected: PASS; help lists all five commands; inspection returns deterministic JSON when `--json` is supplied.

- [ ] **Step 8: Commit the import toolchain**

```bash
git add scripts/import scripts/jcore.ts scripts/validate package.json tests/unit/import-cli.test.ts tests/contract/import-fallback.test.ts
git commit -m "feat: add unified paper import cli with fallback"
```

### Task 5: Add Structured and Source-Fallback Article Views

**Files:**
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/pages/[lang]/articles/[articleId].astro`
- Modify: `src/pages/[lang]/articles/external/[slug].astro`
- Modify: `src/styles/global.css`
- Modify: `src/styles/typography.css`
- Modify: `tests/e2e/article.spec.ts`

**Interfaces:**
- `ArticleLayout` receives `renderReport?: ArticleRenderReport` and uses `renderReport.html`, `renderReport.headings`, and `renderReport.media`.
- Fallback records render metadata, abstract, rights, a `.conversion-notice`, source/PDF links, and a compact import diagnostic summary.

- [ ] **Step 1: Write failing browser assertions**

Extend article tests to assert:

```ts
test('uses the indexed toc ids and has no visible render errors', async ({ page }) => {
  await page.goto('/JCORE/en/articles/external/flashattention-fast-memory-efficient-exact-attention-io-awareness/');
  const tocHref = await page.locator('.article-toc a').first().getAttribute('href');
  expect(tocHref).toBeTruthy();
  await expect(page.locator(`${tocHref}`)).toBeVisible();
  await expect(page.locator('.article-prose .katex-error')).toHaveCount(0);
});

test('source fallback exposes the original source and conversion report', async ({ page }) => {
  await page.goto('/JCORE/en/articles/external/example-fallback/');
  await expect(page.locator('.conversion-notice')).toContainText('structured');
  await expect(page.locator('.source-files a')).toHaveAttribute('download');
});
```

- [ ] **Step 2: Run the focused browser test to verify RED**

Run:

```bash
npm run build:search
npx astro preview --background --host 127.0.0.1 --port 4321
npx playwright test tests/e2e/article.spec.ts
npx astro preview stop
```

Expected: the new selectors fail because routes pass only raw HTML and the fallback view does not exist.

- [ ] **Step 3: Pass the render report from both article routes**

Replace separate `renderArticleBody`/`extractHeadings` calls with one `renderArticle(record.body, { base: config.base })` call. Pass the report to `ArticleLayout`; preserve related article and citation URL behavior.

- [ ] **Step 4: Implement the fallback layout**

Render a `.conversion-notice` only for `renderMode: 'source-fallback'`. Include the original PDF/source links, report path, warning/error summaries, official source URL, and a readable abstract. Keep citation, ownership, and rights panels available. Do not render an empty `.article-prose` as if it were full text.

- [ ] **Step 5: Constrain media and fallback controls**

Add stable `aspect-ratio`/`max-inline-size` rules for PDF embeds, images, tables, code blocks, and source lists. Use real links for every control, visible focus states, and labels that distinguish “Open original PDF” from “Download source package”.

- [ ] **Step 6: Run article browser tests and commit**

Run:

```bash
npm run test:e2e -- tests/e2e/article.spec.ts
```

Expected: all article structure, source/rights, citation, anchor, and mobile overflow tests pass.

```bash
git add src/layouts/ArticleLayout.astro src/pages src/styles tests/e2e/article.spec.ts
git commit -m "feat: render article fallbacks and indexed toc"
```

### Task 6: Repair Header, Theme, and Responsive Interaction States

**Files:**
- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/styles/global.css`
- Modify: `src/styles/typography.css`
- Create: `tests/e2e/header.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- `.masthead-toggle` exposes `aria-expanded`, `aria-controls="jcore-site-nav"`, and a stable accessible name.
- `.nav-drawer` has `id="jcore-site-nav"`, remains hidden until opened, closes on Escape/outside click/link navigation, and restores focus to the toggle.
- `[data-theme-toggle]` exposes `aria-pressed`, initializes before paint from localStorage/system preference, and persists explicit light/dark selection.

- [ ] **Step 1: Write failing interaction tests**

Create `tests/e2e/header.spec.ts` with:

```ts
test('mobile drawer has complete keyboard and focus behavior', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/articles/');
  const toggle = page.locator('.masthead-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('mobile hides the desktop station bar and theme state persists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/JCORE/en/');
  await expect(page.locator('.station-bar')).toBeHidden();
  const toggle = page.locator('[data-theme-toggle]');
  await toggle.click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('dark');
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});
```

Add a 768px assertion that the article grid and media remain within the viewport and the navigation has no clipped controls.

- [ ] **Step 2: Run the interaction tests to verify RED**

Run:

```bash
npm run build:search
bash scripts/run-e2e.sh tests/e2e/header.spec.ts tests/e2e/responsive.spec.ts
```

Expected: fail on missing ARIA state, drawer Escape/focus behavior, visible station bar, or theme persistence.

- [ ] **Step 3: Implement the navigation state machine**

Give the drawer one stable ID and one owner script. Use `hidden`, `aria-expanded`, and `aria-controls` together; handle click, Escape, focus restoration, outside pointer events, and link navigation. Do not rely on positional selectors or duplicate event handlers after Astro navigation.

- [ ] **Step 4: Implement pre-paint theme initialization**

Use a small inline head script in `SiteLayout.astro` or the existing header script to resolve localStorage first, then `prefers-color-scheme`, then the default theme. Update the toggle’s `aria-pressed` state after every change and guard browser-only APIs.

- [ ] **Step 5: Repair responsive CSS**

At `max-width: 720px`, hide `.station-bar`, keep the masthead in a stable three-track grid, allow only the compact actions that fit, and reveal the drawer as the sole mobile navigation surface. At `max-width: 920px`, keep article columns stacked in semantic order. Add `min-width: 0`, `overflow-wrap`, and constrained media dimensions to prevent 390px/768px overflow.

- [ ] **Step 6: Run browser and accessibility tests**

Run:

```bash
bash scripts/run-e2e.sh tests/e2e/header.spec.ts tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts
```

Expected: PASS with no serious or critical axe violations and no horizontal overflow at 390px, 768px, or 1440px.

- [ ] **Step 7: Commit the interaction repair**

```bash
git add src/components/site/SiteHeader.astro src/layouts/SiteLayout.astro src/styles tests/e2e
git commit -m "fix: complete responsive header and theme interactions"
```

### Task 7: Normalize the Existing Eight-Paper Publication Data and Documentation

**Files:**
- Modify: `content/articles/JCORE-2026-0001/body.md`
- Modify: `content/articles/JCORE-2026-0002/body.md`
- Modify: `content/external-articles/attention-is-all-you-need/body.md`
- Modify: `content/external-articles/bert-pretraining-deep-bidirectional-transformers/body.md`
- Modify: `content/external-articles/flashattention-fast-memory-efficient-exact-attention-io-awareness/body.md`
- Modify: `content/external-articles/deepseek-v3-technical-report/body.md`
- Modify: `content/external-articles/mooncake-kvcache-centric-disaggregated-architecture/body.md`
- Modify: `content/external-articles/qwen25-technical-report/body.md`
- Modify: `docs/importing.md`
- Modify: `README.md`

- [ ] **Step 1: Generate a diagnostic inventory before changing corpus files**

Run:

```bash
npm run typecheck
tsx scripts/validate/content.ts
node --import tsx -e "import { getPublishedArticles, getExternalArticles } from './src/lib/content/queries.ts'; import { renderArticle } from './src/lib/article/render.ts'; for (const record of [...getPublishedArticles(), ...getExternalArticles()]) { const report = await renderArticle(record.body, { base: '/JCORE' }); console.log(record.kind === 'external' ? record.slug : record.id, JSON.stringify(report.diagnostics)); }"
```

Record the actual diagnostic codes in the import reports; do not silently delete scientific content to make the output clean.

- [ ] **Step 2: Write a corpus-preservation test**

Extend `tests/contract/article-render-corpus.test.ts` to assert that each existing paper still exposes its known title/section/figure/table signals after normalization, including FlashAttention microbenchmarks, DeepSeek architecture/performance figures, BERT figures, Attention visualizations, Mooncake scheduling figures, Qwen figures, and both JCORE figures.

- [ ] **Step 3: Regenerate only source artifacts that are genuinely visible or structurally invalid**

Use the canonical normalizer to remove visible Pandoc fences, citation source markers, duplicate labels, and malformed math wrappers. Preserve all body paragraphs, headings, figure links, tables, references, and code blocks. Keep figure filenames unchanged unless a source path is unsafe; when a path changes, update both Markdown and `public/figures`.

- [ ] **Step 4: Update operator documentation**

Document the canonical bundle layout, rights gate, source-fallback behavior, exact CLI examples for PDF/LaTeX/JATS/Markdown, staging/promotion workflow, diagnostic meanings, and the rule that `npm run validate` and `npm run check` are offline. Include one example manifest and one fallback report excerpt without inventing redistribution rights.

- [ ] **Step 5: Run corpus and documentation checks**

Run:

```bash
npx vitest run tests/contract/article-render-corpus.test.ts tests/contract/demo-corpus.test.ts tests/contract/external-corpus.test.ts
tsx scripts/validate/content.ts
```

Expected: zero fatal diagnostics and preservation assertions pass for all eight papers.

- [ ] **Step 6: Commit the corpus repair**

```bash
git add content docs/importing.md README.md tests/contract/article-render-corpus.test.ts
git commit -m "docs: document paper import and repair the corpus"
```

### Task 8: Complete Build, Search, Accessibility, and End-to-End Acceptance

**Files:**
- Modify: `tests/contract/built-site.test.ts`
- Modify: `tests/e2e/article.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`
- Modify: `scripts/validate/built-site.ts`
- Modify: `package.json` only if a test command needs a stable wrapper

- [ ] **Step 1: Add generated-site assertions**

Require the built site to contain all bilingual article routes, citation endpoints, Pagefind assets, expected figure assets, no `.katex-error`, no visible Pandoc artifacts, no duplicate HTML IDs, and no broken local links or media references.

- [ ] **Step 2: Run the complete required verification sequence**

Run each command separately and retain its exit code/output:

```bash
npm run typecheck
npm run lint
npm test
npm run build:search
npm run test:e2e
```

Expected: every command exits `0`; Vitest reports zero failed tests; Playwright reports zero failed tests; the generated `dist/` contains Pagefind and all expected static routes.

- [ ] **Step 3: Run the final review-oriented checks**

Run:

```bash
git diff --check
git status --short
git log --oneline --decorate -12
```

Inspect the diff for accidental generated files, untracked source archives without rights evidence, layout regressions, or changes outside the file map.

- [ ] **Step 4: Commit acceptance tests and validation**

```bash
git add tests scripts/validate/built-site.ts package.json
git commit -m "test: verify publication pipeline and responsive site"
```

- [ ] **Step 5: Report the operational result**

Include the exact CLI entry point, the final verification commands and observed results, the staging/promotion locations, any warnings intentionally retained in reports, and the local preview URL if a server is started for browser inspection.

## Plan Self-Review

- **Spec coverage:** Rendering, structural IDs, math, tables, media, safety, fallback records, rights, deterministic imports, all five CLI commands, promotion, source preservation, responsive header/theme/TOC, eight-paper corpus coverage, build/search/accessibility/e2e validation are each assigned to a task.
- **Placeholder scan:** No `TBD`, `TODO`, “implement later”, or unspecified “handle edge cases” steps remain; each implementation step names files, interfaces, commands, and expected outcomes.
- **Type consistency:** `ArticleRenderReport` is introduced in Task 1 and consumed by Tasks 2 and 5; representation fields are introduced in Task 3 and consumed by Tasks 4 and 5; CLI types are introduced in Task 4 and covered by Tasks 4 and 8.
- **Scope:** The plan stays within the approved design: no database, authentication, online submission, peer review, DOI registration, or unrelated visual rewrite.
