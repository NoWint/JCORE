# JCORE

Journal of Computing and Open Research for Exploration

JCORE is a bilingual, fully static scholarly journal built with Astro, TypeScript, and a strict repository-driven publication pipeline. It publishes clearly marked demonstration JCORE records and rights-tracked external open-access articles in a unified reading layout.

## Commands

```bash
npm install
npm run dev
npm run check
npm run validate
npm run test:e2e
npm run build:search
npm run jcore -- --help
```

`npm run check` runs type checking, linting, unit and contract tests, the Astro build, Pagefind indexing, and built-site link validation.

## Content Model

- `content/articles/` contains JCORE-published demonstration articles.
- `content/external-articles/` contains external open-access articles with provenance and rights evidence.
- `content/authors/`, `content/issues/`, `content/selections/`, and `content/pages/` hold the remaining journal data.
- `sources/manifests/` records import provenance for external full text.

External articles are never presented as JCORE publications. Every discovery and reading surface labels their original source, license, and ownership status.

## Import Pipeline

Use the unified CLI for future paper intake:

```bash
npm run jcore -- inspect path/to/source --json
npm run jcore -- import path/to/source --manifest path/to/manifest.yaml
npm run jcore -- report .jcore/staging/article-slug
npm run jcore -- validate .jcore/staging/article-slug
npm run jcore -- promote .jcore/staging/article-slug --content-root content/external-articles --public-root public/sources
```

Supported input types are PDF, LaTeX, JATS XML, Markdown, and recorded DOI
resolutions. Structured conversion is preferred. If conversion is unsafe or
unavailable, the CLI preserves the original source and emits an explicit
source-fallback record with diagnostics instead of publishing a misleading
empty article body.

## Deployment

GitHub Actions builds the static site and Pagefind index, then deploys `dist/` to GitHub Pages.
