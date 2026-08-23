# JCORE Publishing MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a bilingual, fully static JCORE journal MVP with strict repository-driven import, a unified scholarly reading layout, six legally renderable external open-access articles, two clearly marked demonstration JCORE articles, static search, citations, and GitHub Pages automation.

**Architecture:** Astro generates every public route at build time. Typed content contracts and relationship validators sit between normalized repository content and page templates. LaTeX, JATS, and DOI adapters are offline-first and emit deterministic normalized records; network discovery is an explicit editorial command whose recorded result is committed before a normal build.

**Tech Stack:** Astro 7.2.x, TypeScript 7.x, Zod 4.x, Markdown with remark-math/rehype-katex, KaTeX, Pagefind 1.x, Vitest 4.x, Playwright 1.x, axe-core Playwright integration, Pandoc wrapper for source conversion, GitHub Actions, GitHub Pages.

## Global Constraints

- The deployed site is static HTML/CSS/JS/assets only; no runtime server, database, fake API, or simulated review backend.
- Routes use explicit `/en/` and `/zh/` locale prefixes; root redirects or falls back to English without losing a project-pages base path.
- JCORE records use stable IDs `JCORE-YYYY-NNNN`; external records use `/articles/external/<slug>/` and never receive a JCORE ID or issue relation.
- External article discovery surfaces must show `External Open-Access Article`, original source, rights/license, and `Not published by JCORE`.
- All article, author, issue, selection, page, citation, provenance, and resource lists come from data collections; templates cannot hard-code records.
- Demonstration records are explicitly fictional and use dates no later than August 23, 2026; they cannot claim real peer review, DOI registration, or real affiliations.
- A full-text external record is publishable only when a supported LaTeX/JATS source, checksum, provenance, and verifiable rights evidence exist.
- PDF is vendored only when redistribution is explicitly allowed; otherwise the page links to the official PDF and the MVP never generates a JCORE PDF.
- Build-time validation is strict: any schema, relationship, rights, asset, reference, conversion, typecheck, lint, test, link, or browser failure blocks publication.
- Git commits are technical history only; public timelines expose scholarly events such as Submitted, Revised, Accepted, and Version of Record.
- Use the existing Git identity (`完了有给` / `x674000249@gmail.com`) and the existing `NoWint/JCORE` remote; never overwrite an existing remote.

---

### Task 1: Scaffold the Static Astro Workspace

**Files:**
- Create: `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.node-version`
- Create: `src/lib/site-config.ts`, `src/pages/index.astro`
- Modify: `.gitignore`
- Test: `tests/unit/site-config.test.ts`

**Interfaces:**
- `getSiteConfig(env?: Record<string, string | undefined>): { site: URL; base: string; locales: ['en', 'zh']; defaultLocale: 'en' }`
- `src/pages/index.astro` emits a base-aware static link to `/en/` and a visible Chinese alternate.

- [ ] **Step 1: Write the failing site-config tests**

```ts
import { describe, expect, it } from 'vitest';
import { getSiteConfig } from '../../src/lib/site-config';

describe('getSiteConfig', () => {
  it('uses project-pages defaults', () => {
    expect(getSiteConfig({}).base).toBe('/JCORE');
    expect(getSiteConfig({}).locales).toEqual(['en', 'zh']);
  });

  it('switches to root deployment for a custom site URL', () => {
    expect(getSiteConfig({ PUBLIC_SITE_URL: 'https://journal.example' }).base).toBe('');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/unit/site-config.test.ts`

Expected: FAIL because the package and `getSiteConfig` do not exist.

- [ ] **Step 3: Add the Astro package and static configuration**

Create scripts for `dev`, `build`, `build:search`, `check`, `typecheck`, `lint`, `format`, `test`, `test:unit`, `test:e2e`, and `validate`. Configure `output: 'static'`, project-page defaults, and environment overrides without hard-coding `/JCORE/` in templates.

- [ ] **Step 4: Run the focused test and static checks**

Run: `npm test -- tests/unit/site-config.test.ts && npm run check`

Expected: PASS with zero TypeScript diagnostics.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src tests .node-version eslint.config.js .prettierrc.json .gitignore
git commit -m "build: scaffold static Astro journal"
```

### Task 2: Define Content Contracts and the Publication Gate

**Files:**
- Create: `src/content.config.ts`, `src/lib/content/contracts.ts`, `src/lib/content/types.ts`
- Create: `scripts/validate/diagnostics.ts`, `scripts/validate/publication.ts`, `scripts/validate/content.ts`
- Test: `tests/unit/content-contracts.test.ts`, `tests/contract/publication-validator.test.ts`, `tests/fixtures/validation/**`

**Interfaces:**
- `validatePublication(index: CollectionIndex): Diagnostic[]`
- `Diagnostic = { code: string; severity: 'error' | 'warning'; phase: string; sourcePath: string; node?: string; message: string; action: string }`
- `ArticleRecord`, `ExternalArticleRecord`, `AuthorRecord`, `IssueRecord`, `SelectionRecord`, `PublicationEvent` are discriminated by `kind` and validated by Zod.

- [ ] **Step 1: Write failing contract tests**

Cover localized strings, ordered authors, JCORE ID format, external `notPublishedByJCORE`, rights evidence, and rejection of an external article with `issue` or a JCORE ID.

- [ ] **Step 2: Run tests to verify expected schema failures**

Run: `npm test -- tests/unit/content-contracts.test.ts tests/contract/publication-validator.test.ts`

Expected: FAIL because schemas and validator are absent.

- [ ] **Step 3: Implement the Zod contracts and cross-collection invariants**

Use localized `{ en: string; zh?: string }`, source provenance, checksums, licenses, body language, resource policies, and explicit demo flags. Ensure diagnostics include source path/node and a corrective action.

- [ ] **Step 4: Run focused and full unit tests**

Run: `npm test -- tests/unit/content-contracts.test.ts tests/contract/publication-validator.test.ts && npm run typecheck`

Expected: PASS with no type errors.

- [ ] **Step 5: Commit the contracts**

```bash
git add src/content.config.ts src/lib/content scripts/validate tests
git commit -m "feat: add strict scholarly content contracts"
```

### Task 3: Seed the Demonstration Issue and JCORE Records

**Files:**
- Create: `content/authors/demo-author-001.yaml` through `content/authors/demo-author-010.yaml`
- Create: `content/issues/volume-1-issue-1.yaml`
- Create: `content/articles/JCORE-2026-0001/index.md`, `content/articles/JCORE-2026-0001/body.md`
- Create: `content/articles/JCORE-2026-0002/index.md`, `content/articles/JCORE-2026-0002/body.md`
- Create: `public/figures/JCORE-2026-0001/`, `public/figures/JCORE-2026-0002/`
- Test: `tests/contract/demo-corpus.test.ts`

**Interfaces:**
- Content files satisfy Task 2 schemas and are discoverable by the collection loader.
- Both records are `kind: jcore`, `demo: true`, assigned to Volume 1 Issue 1, and use `replication-study` so the MVP demonstrates the requested replication workflow without inventing a real publication.

- [ ] **Step 1: Write failing corpus tests**

Assert exactly one issue, ten authors, two JCORE articles, closed author/issue relations, two replication studies, no future dates, and no DOI values on demo records.

- [ ] **Step 2: Run tests and verify they fail because content is absent**

Run: `npm test -- tests/contract/demo-corpus.test.ts`

Expected: FAIL with missing collection records.

- [ ] **Step 3: Add bilingual metadata and semantic article bodies**

Use fictional names and affiliations marked `demo: true`. Include equations, a figure reference, a table, a footnote, a code block, references, and a version timeline in the two bodies so rendering paths are exercised.

- [ ] **Step 4: Run corpus validation**

Run: `npm run validate && npm test -- tests/contract/demo-corpus.test.ts`

Expected: PASS; no demo record claims real publication.

- [ ] **Step 5: Commit the corpus**

```bash
git add content public/figures tests/contract/demo-corpus.test.ts
git commit -m "content: add marked JCORE demonstration issue"
```

### Task 4: Build the Deterministic Import Core

**Files:**
- Create: `scripts/import/types.ts`, `scripts/import/manifest.ts`, `scripts/import/checksum.ts`, `scripts/import/registry.ts`, `scripts/import/writer.ts`, `scripts/import/report.ts`, `scripts/import/run-import.ts`
- Test: `tests/unit/import-manifest.test.ts`, `tests/contract/import-determinism.test.ts`, `tests/fixtures/import/core/**`

**Interfaces:**
- `runImport(manifest: ImportManifest, deps: ImportDependencies): Promise<ImportReport>`
- `SourceAdapter<T> = { sourceType; inspect; parse; normalize }`
- `emitImport(report: SuccessfulImport, staging: StagingArea): Promise<ImportArtifacts>`

- [ ] **Step 1: Write failing tests for manifest validation, checksum failures, atomic output, and deterministic output**

Run twice against one fixture and compare normalized metadata, body, assets, and report JSON byte-for-byte.

- [ ] **Step 2: Verify the tests fail for missing import core**

Run: `npm test -- tests/unit/import-manifest.test.ts tests/contract/import-determinism.test.ts`

Expected: FAIL because adapters and writer are absent.

- [ ] **Step 3: Implement manifest discriminated unions and transactional writer**

Reject unsafe target paths and checksum mismatches. Write to a temporary staging directory and rename only after all diagnostics are error-free. Never leave partial normalized output after a failed run.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- tests/unit/import-manifest.test.ts tests/contract/import-determinism.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the import core**

```bash
git add scripts/import tests/fixtures/import/core tests/unit/import-manifest.test.ts tests/contract/import-determinism.test.ts
git commit -m "feat: add deterministic import pipeline core"
```

### Task 5: Add the Secure LaTeX Adapter

**Files:**
- Create: `scripts/import/adapters/latex.ts`, `scripts/import/converters/pandoc.ts`, `scripts/import/security/tex.ts`
- Test: `tests/unit/latex-adapter.test.ts`
- Fixtures: `tests/fixtures/import/latex/{valid,ambiguous-root,unsafe-shell,absolute-or-traversal,missing-bib,missing-asset,unresolved-ref}/`

**Interfaces:**
- `LatexAdapter` implements `SourceAdapter<ParsedLatex>` from Task 4.
- `LatexConverter.convert(input, options): Promise<NormalizedDraft>` is injectable; unit tests use a deterministic fixture converter.

- [ ] **Step 1: Write failing fixture tests**

The valid fixture must produce sections, equations, figures, tables, footnotes, code, and references. Every unsafe fixture must produce a fatal diagnostic naming the file/node and corrective action.

- [ ] **Step 2: Run focused tests to confirm they fail**

Run: `npm test -- tests/unit/latex-adapter.test.ts`

Expected: FAIL because `LatexAdapter` is absent.

- [ ] **Step 3: Implement inventory and secure conversion**

Require a declared root file; reject absolute paths, `..`, symlink escape, shell escape, unsafe TeX commands, multiple roots, missing assets, missing bibliography, and unresolved citations before conversion. Pin the Pandoc command shape and never enable shell escape.

- [ ] **Step 4: Run focused and import regression tests**

Run: `npm test -- tests/unit/latex-adapter.test.ts tests/contract/import-determinism.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```bash
git add scripts/import tests/fixtures/import/latex tests/unit/latex-adapter.test.ts
git commit -m "feat: add secure LaTeX article import"
```

### Task 6: Add the Secure JATS Adapter

**Files:**
- Create: `scripts/import/adapters/jats.ts`, `scripts/import/parsers/xml.ts`
- Test: `tests/unit/jats-adapter.test.ts`
- Fixtures: `tests/fixtures/import/jats/{valid,missing-permissions,external-entity,bad-xref,duplicate-id,missing-asset}/`

**Interfaces:**
- `JatsAdapter` implements `SourceAdapter<ParsedJats>`.
- `parseJats(xml, options)` disables DTD and external entity resolution.

- [ ] **Step 1: Write failing JATS fixture tests**

Cover article metadata, contributors, affiliations, permissions, sections, figures, tables, footnotes, and reference lists; reject XXE, missing permissions, broken cross-references, duplicate IDs, and missing assets.

- [ ] **Step 2: Verify expected failures**

Run: `npm test -- tests/unit/jats-adapter.test.ts`

Expected: FAIL because the parser and adapter are absent.

- [ ] **Step 3: Implement secure XML parsing and semantic mapping**

Use `fast-xml-parser` with entity expansion disabled, map JATS nodes into the normalized body model, and emit diagnostics with XML node paths.

- [ ] **Step 4: Run focused and full import tests**

Run: `npm test -- tests/unit/jats-adapter.test.ts tests/unit/latex-adapter.test.ts tests/contract/import-determinism.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```bash
git add scripts/import scripts/import/parsers tests/fixtures/import/jats tests/unit/jats-adapter.test.ts
git commit -m "feat: add secure JATS article import"
```

### Task 7: Add Offline DOI Resolution and Provenance Checks

**Files:**
- Create: `scripts/import/adapters/doi.ts`, `scripts/import/clients/crossref.ts`, `scripts/import/clients/arxiv.ts`, `scripts/import/source-discovery.ts`
- Test: `tests/unit/doi-adapter.test.ts`
- Fixtures: `tests/fixtures/import/doi/{resolution-valid,metadata-only,license-denied,checksum-mismatch}/`

**Interfaces:**
- `discoverDoi(manifest, clients): Promise<DoiResolution>` is network-only and never called by normal builds.
- `validateDoiResolution(resolution): Diagnostic[]` verifies source package, checksum, rights evidence, official URL, and retrieval date.
- `DoiAdapter` consumes a recorded `DoiResolution` and delegates source parsing to Task 5 or Task 6.

- [ ] **Step 1: Write failing recorded-fixture tests**

Assert metadata-only resolutions cannot emit full text, denied licenses fail, checksum mismatches fail, and valid resolutions are normalized without live HTTP.

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- tests/unit/doi-adapter.test.ts`

Expected: FAIL because resolution validation is absent.

- [ ] **Step 3: Implement recorded resolution validation and adapter delegation**

Keep live discovery in an explicit editorial CLI. Normal `npm run validate` and `npm run build` must never access DOI, Crossref, arXiv, or publisher URLs.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/doi-adapter.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit DOI support**

```bash
git add scripts/import tests/fixtures/import/doi tests/unit/doi-adapter.test.ts
git commit -m "feat: add offline DOI resolution import"
```

### Task 8: Add the Six External Article Records and Selection Data

**Files:**
- Create: `sources/manifests/*.yaml`, `sources/manifests/reports/*.json`
- Create: `content/external-articles/<slug>/index.md`, `content/external-articles/<slug>/body.md`
- Create: `content/selections/featured-external.yaml`
- Create: `public/figures/<slug>/` and only legally redistributable `public/papers/<slug>.pdf`
- Test: `tests/contract/external-corpus.test.ts`

**Interfaces:**
- Each external record satisfies `ExternalArticleRecord`, has `notPublishedByJCORE: true`, no `issue`, no JCORE ID, and a complete `Provenance` record.
- The corpus query returns exactly six records with three AI/ML/Transformer works, one DeepSeek work, one Moonshot/Kimi work, and one third-lab work.

- [ ] **Step 1: Add per-record failing contract tests and manifests**

Use candidates *Attention Is All You Need*, *BERT*, *FlashAttention*, *DeepSeek-V3 Technical Report*, *Kimi k1.5*, and *Qwen2.5 Technical Report*. Each manifest includes official URL, identifier, retrieval date, checksum, license ID/URL, copyright holder, evidence URL, and source format. A candidate that fails rights or source validation is replaced before its test is made green.

- [ ] **Step 2: Run the corpus tests and observe failures for missing records**

Run: `npm test -- tests/contract/external-corpus.test.ts`

Expected: FAIL with missing external records.

- [ ] **Step 3: Import or author normalized bodies only after rights/source gates pass**

Use the adapters and record provenance reports. Keep external contributor lists separate from JCORE author entities. Preserve source attribution and copyright notices in body metadata and page copy.

- [ ] **Step 4: Run corpus, rights, and relationship validation**

Run: `npm run validate && npm test -- tests/contract/external-corpus.test.ts`

Expected: PASS with six external records and no issue/JCORE relations.

- [ ] **Step 5: Commit the external corpus**

```bash
git add sources content/external-articles content/selections public/figures public/papers tests/contract/external-corpus.test.ts
git commit -m "content: add rights-tracked external research corpus"
```

### Task 9: Add Query, Localization, and Base-Aware Route Models

**Files:**
- Create: `src/lib/content/repository.ts`, `src/lib/content/queries.ts`, `src/lib/content/view-models.ts`, `src/lib/i18n.ts`, `src/lib/routes.ts`
- Test: `tests/unit/queries.test.ts`, `tests/unit/i18n.test.ts`, `tests/unit/routes.test.ts`

**Interfaces:**
- `getPublishedArticles()`, `getArticleById(id)`, `getExternalArticleBySlug(slug)`, `getIssueById(id)`, `getAuthorById(id)`, `getArticlesForAuthor(id)`, `getArticlesForIssue(id)`.
- `localize(value, locale, fallbackLocale): string`.
- `makeRoute(locale, path): string`, `canonicalForRecord(record): URL`, `alternateLinks(record): Array<{ lang: string; href: URL }>`.

- [ ] **Step 1: Write failing query and route tests**

Cover original-body fallback, translated metadata, issue exclusion of external articles, external contributors excluded from JCORE author pages, base-aware paths, canonical language identity, and no duplicate locale segments.

- [ ] **Step 2: Verify failures**

Run: `npm test -- tests/unit/queries.test.ts tests/unit/i18n.test.ts tests/unit/routes.test.ts`

Expected: FAIL because query and route modules are absent.

- [ ] **Step 3: Implement collection loaders, joins, localization, and route helpers**

Keep all joins in typed query functions so pages remain declarative.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/queries.test.ts tests/unit/i18n.test.ts tests/unit/routes.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit domain queries**

```bash
git add src/lib/content src/lib/i18n.ts src/lib/routes.ts tests/unit/queries.test.ts tests/unit/i18n.test.ts tests/unit/routes.test.ts
git commit -m "feat: add typed journal queries and bilingual routes"
```

### Task 10: Implement the Journal Shell and Institutional Pages

**Files:**
- Create: `src/layouts/SiteLayout.astro`, `src/layouts/PageLayout.astro`, `src/components/site/**`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/typography.css`
- Create: `content/pages/about.en.md`, `content/pages/about.zh.md`, `content/pages/submit.en.md`, `content/pages/submit.zh.md`, `content/pages/editorial-board.en.md`, `content/pages/editorial-board.zh.md`, `content/pages/policies.en.md`, `content/pages/policies.zh.md`
- Create: `src/pages/[lang]/about/index.astro`, `src/pages/[lang]/submit/index.astro`, `src/pages/[lang]/editorial-board/index.astro`, `src/pages/[lang]/policies/index.astro`
- Test: `tests/e2e/institutional.spec.ts`

**Interfaces:**
- `SiteLayout` receives `locale`, `title`, `description`, `canonical`, and `alternateLinks`.
- `LanguageSwitcher` uses `makeRoute` and never constructs raw `/JCORE/` paths.
- `OwnershipBadge` is reusable by every discovery and reading surface.

- [ ] **Step 1: Write failing browser tests**

Assert bilingual navigation, root language entry, institutional route generation, “submission not yet open,” no invented real editors, and no horizontal overflow at 390px.

- [ ] **Step 2: Run the browser tests and verify missing-route failures**

Run: `npm run test:e2e -- tests/e2e/institutional.spec.ts`

Expected: FAIL because the shell and routes are absent.

- [ ] **Step 3: Implement the editorial visual system and pages**

Use Source Serif 4 for article reading text, a restrained sans-serif for metadata, warm-white/white surfaces, fine borders, generous measure, minimal accent color, and no gradients, dashboard cards, or oversized hero. Mark board members as demonstration status without fabricating real people.

- [ ] **Step 4: Run focused browser tests and accessibility smoke checks**

Run: `npm run build && npm run test:e2e -- tests/e2e/institutional.spec.ts`

Expected: PASS with no horizontal overflow or missing canonical/hreflang tags.

- [ ] **Step 5: Commit the shell**

```bash
git add src/layouts src/components/site src/styles content/pages src/pages tests/e2e/institutional.spec.ts
git commit -m "feat: add bilingual scholarly journal shell"
```

### Task 11: Implement Homepage, Articles, Issues, and Authors

**Files:**
- Create: `src/pages/[lang]/index.astro`, `src/pages/[lang]/articles/index.astro`, `src/pages/[lang]/issues/index.astro`, `src/pages/[lang]/issues/[issueId].astro`, `src/pages/[lang]/authors/index.astro`, `src/pages/[lang]/authors/[authorId].astro`
- Create: `src/components/discovery/**`
- Test: `tests/e2e/discovery.spec.ts`

**Interfaces:**
- Pages consume only Task 9 query functions and view models.
- `ArticleCard` always renders ownership, source, and publication labels from the record.

- [ ] **Step 1: Write failing discovery tests**

Assert current issue, latest records, category filters, JCORE/external ownership labels, issue exclusion of external articles, author reverse joins, and all English/Chinese static paths.

- [ ] **Step 2: Verify missing-page failures**

Run: `npm run build && npm run test:e2e -- tests/e2e/discovery.spec.ts`

Expected: FAIL with missing generated routes.

- [ ] **Step 3: Implement static paths and data-driven discovery components**

Generate paths for every locale and record. Add client-side filters with progressive enhancement; the unfiltered HTML remains complete and usable.

- [ ] **Step 4: Run discovery tests**

Run: `npm run build && npm run test:e2e -- tests/e2e/discovery.spec.ts`

Expected: PASS; `dist` contains all expected locale and record routes.

- [ ] **Step 5: Commit discovery pages**

```bash
git add src/pages src/components/discovery tests/e2e/discovery.spec.ts
git commit -m "feat: add journal discovery pages"
```

### Task 12: Implement Article Reading, Citations, and Scholarly Metadata

**Files:**
- Create: `src/pages/[lang]/articles/[articleId].astro`, `src/pages/[lang]/articles/external/[slug].astro`, `src/layouts/ArticleLayout.astro`, `src/components/article/**`
- Create: `src/lib/article/render.ts`, `src/lib/article/related.ts`, `src/lib/citations.ts`, `src/lib/metadata.ts`
- Create: `src/pages/citations/[slug].txt.ts`, `src/pages/citations/[slug].bib.ts`, `src/pages/citations/[slug].ris.ts`
- Test: `tests/unit/citations.test.ts`, `tests/unit/metadata.test.ts`, `tests/e2e/article.spec.ts`

**Interfaces:**
- `formatPlainCitation(record, locale): string`.
- `formatBibTeX(record): string`.
- `formatRIS(record): string`.
- `buildArticleMetadata(record, locale): ScholarlyMetadata`.

- [ ] **Step 1: Write failing citation, metadata, and article-browser tests**

Cover semantic headings, KaTeX equations, table/figure/caption, footnote, code block, references, publication timeline, bilingual abstract fallback, and visible external rights/source labels in the article header, citation panel, and resource area. Assert external citations use original venue and demo records never emit empty DOI fields.

- [ ] **Step 2: Verify failures**

Run: `npm test -- tests/unit/citations.test.ts tests/unit/metadata.test.ts && npm run build && npm run test:e2e -- tests/e2e/article.spec.ts`

Expected: FAIL because article routes, renderers, and metadata generators are absent.

- [ ] **Step 3: Implement the shared article layout and derived outputs**

Configure Markdown math and footnotes, render normalized body blocks, generate table of contents and related articles, and derive JSON-LD, Open Graph, canonical, alternates, Highwire citation tags, BibTeX, RIS, and plain text from the contract.

- [ ] **Step 4: Run focused tests and inspect built HTML**

Run: `npm test -- tests/unit/citations.test.ts tests/unit/metadata.test.ts && npm run build && npm run test:e2e -- tests/e2e/article.spec.ts`

Expected: PASS; built HTML contains equation markup, scholarly tags, rights notices, and no unregistered demo DOI.

- [ ] **Step 5: Commit article reading experience**

```bash
git add src/pages src/layouts/ArticleLayout.astro src/components/article src/lib/article src/lib/citations.ts src/lib/metadata.ts tests
git commit -m "feat: add scholarly article reading and citation outputs"
```

### Task 13: Add Pagefind Static Search

**Files:**
- Create: `src/pages/[lang]/search/index.astro`, `src/components/search/**`, `src/scripts/search.ts`
- Modify: `package.json`, article/discovery components for Pagefind attributes
- Test: `tests/contract/pagefind-index.test.ts`, `tests/e2e/search.spec.ts`

**Interfaces:**
- `npm run build:search` runs Astro build first, then `pagefind --site dist`.
- Searchable page metadata includes title, authors, abstract, keywords, ID, DOI/arXiv, and ownership filter values.

- [ ] **Step 1: Write failing build/search tests**

Assert `dist/pagefind` exists after the search build and representative English/Chinese queries return records with ownership labels.

- [ ] **Step 2: Verify failure before Pagefind integration**

Run: `npm run build:search && npm test -- tests/contract/pagefind-index.test.ts`

Expected: FAIL because no index or search route exists.

- [ ] **Step 3: Implement base-aware Pagefind UI and indexed attributes**

Load the Pagefind bundle using Astro-resolved base paths. Keep search usable without JavaScript by providing a link to the articles index and expose ownership facets in the enhanced UI.

- [ ] **Step 4: Run build and browser search tests**

Run: `npm run build:search && npm run test:e2e -- tests/e2e/search.spec.ts`

Expected: PASS for title, author, abstract, keyword, ID, DOI/arXiv, English, Chinese, and ownership labeling.

- [ ] **Step 5: Commit static search**

```bash
git add package.json src/pages src/components/search src/scripts tests
git commit -m "feat: add bilingual static scholarly search"
```

### Task 14: Add Release Validation, Browser QA, and GitHub Pages Deployment

**Files:**
- Create: `scripts/validate/built-site.ts`, `tests/contract/built-site.test.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/accessibility.spec.ts`
- Create: `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `README.md`, `docs/importing.md`, `public/404.html`
- Modify: `package.json`, `astro.config.mjs`

**Interfaces:**
- `npm run validate` validates source collections, relationships, rights, assets, and references.
- `npm run check` runs typecheck, lint, unit/contract tests, build, and built-site checks.
- Pages workflow uploads `dist` with `actions/upload-pages-artifact` and deploys with `actions/deploy-pages`.

- [ ] **Step 1: Write failing built-site and QA tests**

Assert no broken internal links, no missing local assets, expected routes and language alternates, no horizontal overflow at 390px and 1440px, and no serious axe violations on homepage, article, issue, author, search, and Chinese pages.

- [ ] **Step 2: Run the release suite and capture the failures**

Run: `npm run check`

Expected: FAIL until built-site validators, browser fixtures, and CI scripts exist.

- [ ] **Step 3: Implement validators, docs, and Pages workflows**

Pin the Node version from `.node-version`, run normal CI without network discovery, build Pagefind before uploading `dist`, and configure Pages permissions/concurrency. Document local import commands, rights requirements, supported source formats, and the “not yet open” submission status.

- [ ] **Step 4: Run the full release gate locally**

Run:

```bash
npm ci
npm run validate
npm run typecheck
npm run lint
npm run test:unit
npm run build:search
npm run test:e2e
```

Expected: every command exits 0; `dist` is static and contains `pagefind` assets.

- [ ] **Step 5: Verify project-pages URLs and push**

Run: `PUBLIC_SITE_URL="https://nowint.github.io/JCORE" npm run build:search` and inspect generated links for `/JCORE/` prefix, then `git push origin main`.

- [ ] **Step 6: Confirm GitHub Actions deployment**

Run: `gh run list --repo NoWint/JCORE --limit 5` and `gh run watch --repo NoWint/JCORE <run-id>`.

Expected: CI and Pages workflows complete successfully and the repository Pages environment reports a deployed artifact.

- [ ] **Step 7: Commit release documentation and workflows**

```bash
git add scripts/validate/built-site.ts tests .github README.md docs/importing.md public/404.html package.json astro.config.mjs
git commit -m "ci: validate and deploy the static journal"
git push origin main
```

## Execution Order

Tasks 1 through 4 are sequential. Tasks 5, 6, and 7 can be developed independently after Task 4, but their changes must be integrated before Task 8. Tasks 9 and 10 depend on the content/query boundary; Tasks 11 and 12 can proceed in parallel after Task 10. Task 13 follows the generated pages. Task 14 is the final release gate.

## Plan Self-Review

- **Spec coverage:** static Astro output (1, 14); bilingual routes and metadata (9, 10, 12); content schemas and relations (2, 3, 8, 9); LaTeX/JATS/DOI import (4-7); six external records and rights (8); unified rendering and citations (12); static search (13); policies/submission/editorial board (10); validation, responsive, accessibility, and deployment (14).
- **Placeholder scan:** no `TBD`, `TODO`, “implement later,” or undefined task references appear in the plan. Candidate replacement behavior is specified as a deterministic rights gate, not a placeholder.
- **Type consistency:** Task 4 defines `ImportManifest`, `ImportDependencies`, `SourceAdapter`, `ImportReport`, and `ImportArtifacts`; Tasks 5-7 consume those interfaces. Task 9 defines query and route helpers consumed by Tasks 10-12. Task 12 defines citation/metadata functions used by page templates and tests. Task 14 composes the named npm scripts.
- **Scope:** the plan keeps correction/retraction workflows, live editorial operations, and PDF generation out of the MVP while leaving their data boundaries extensible.
