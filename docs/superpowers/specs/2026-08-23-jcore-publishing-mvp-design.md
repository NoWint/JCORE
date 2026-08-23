# JCORE Publishing MVP Design

**Date:** 2026-08-23
**Status:** Approved

## 1. Product Definition

JCORE is **Journal of Computing and Open Research for Exploration**: a multilingual scholarly publication for computing, artificial intelligence, and related interdisciplinary research. It is a journal, not a personal site, blog, portfolio, contest showcase, SaaS dashboard, or simulated editorial backend.

The MVP must provide a credible, data-driven static publication experience while avoiding capabilities that do not exist. Git is the technical content source; public scholarly metadata is the publication record.

## 2. MVP Outcomes

The first release must deliver:

- a fully static, GitHub Pages-compatible website;
- English and Chinese interface routes under `/en/` and `/zh/`;
- bilingual titles, abstracts, and keywords when translations are available;
- article bodies in their original language;
- one clearly marked demonstration issue with two clearly marked fictional demonstration JCORE articles;
- six real, legally redistributable external open-access articles rendered in the JCORE reading layout;
- repository-driven LaTeX, JATS XML, and DOI/link import workflows;
- article, author, issue, search, submission, about, editorial board, and policy pages;
- scholarly citation and discovery metadata;
- automated validation, build, test, and GitHub Pages deployment.

The MVP deliberately favors a small, reliable publication surface over a broad simulated journal management system.

## 3. Technical Choice

Use **Astro with TypeScript in static output mode**.

Astro owns routing, templates, content presentation, and static generation. A build-time TypeScript import pipeline normalizes source formats into one JCORE content contract. Page templates never parse LaTeX, JATS, DOI responses, or publisher pages directly.

Use:

- Astro for static rendering;
- TypeScript and Zod for content contracts and validation;
- Markdown/HTML as the normalized article-body representation;
- unified/remark/rehype where appropriate for normalized Markdown processing;
- Pandoc as an optional command-line converter for supported LaTeX and JATS transformations, wrapped by deterministic validation code;
- KaTeX for mathematical rendering;
- Pagefind for post-build static search;
- Vitest for unit and contract tests;
- Playwright for route, responsive, and accessibility smoke tests;
- GitHub Actions and GitHub Pages for continuous deployment.

Node.js is a build-time tool only. The deployed site must not require Node.js, a server process, an API, or a database.

## 4. Repository Boundaries

```text
JCORE/
├── content/
│   ├── articles/              # JCORE-published normalized articles
│   ├── external-articles/     # external open-access normalized articles
│   ├── authors/               # reusable author entities
│   ├── issues/                # volume and issue records
│   ├── pages/                 # bilingual institutional content
│   └── selections/            # lightweight editorial associations
├── sources/
│   ├── manifests/             # import manifests and provenance
│   ├── latex/                 # approved source packages
│   └── jats/                  # approved JATS XML packages
├── public/
│   ├── papers/                # redistributable PDFs only
│   ├── figures/               # normalized article assets
│   └── assets/                # journal assets and fonts
├── scripts/
│   ├── import/                # adapters and normalization pipeline
│   └── validate/              # contracts, rights, references, and links
├── src/
│   ├── components/            # presentation components
│   ├── content.config.ts      # Astro collections and Zod schemas
│   ├── layouts/               # journal and article layouts
│   ├── lib/                   # queries, citations, i18n, and metadata
│   ├── pages/                 # static routes and generated endpoints
│   └── styles/                # tokens and typography
├── tests/                     # unit, contract, and browser tests
└── .github/workflows/         # validation and Pages deployment
```

Raw sources, normalized content, UI, and publishing automation remain separate so each unit can be understood and changed independently.

## 5. Routes and Language Behavior

The canonical interface routes are:

```text
/
/en/
/zh/
/en/articles/
/zh/articles/
/en/articles/JCORE-2026-0001/
/zh/articles/JCORE-2026-0001/
/en/articles/external/<slug>/
/zh/articles/external/<slug>/
/en/issues/
/zh/issues/
/en/issues/volume-1/issue-1/
/zh/issues/volume-1/issue-1/
/en/authors/<author-id>/
/zh/authors/<author-id>/
/en/search/
/zh/search/
/en/submit/
/zh/submit/
```

The root route redirects to English while exposing explicit language controls. Each translated page links to its alternate language route with `hreflang`. Article bodies are shared across interface languages when no translated body exists; interface labels and available title, abstract, and keyword translations still change.

Canonical scholarly identity is independent of interface language. Both language views point to a configured canonical publication URL and identify alternates.

## 6. Content Model

### 6.1 Author

An author is an independent entity, not a text string embedded in an article.

Required fields:

- `id`: stable lowercase identifier;
- `name`: display name plus optional localized form;
- `affiliations`: structured organization identifiers and labels;
- `bio`: optional bilingual biography;
- `orcid`: optional validated ORCID;
- `links`: optional GitHub and official profile URLs;
- `researchInterests`: bilingual labels where available;
- `demo`: whether the author is explicitly fictional demonstration data.

Article records reference author IDs in display order. The relation supports corresponding-author and equal-contribution flags without duplicating author profiles.

### 6.2 JCORE Article

Required fields:

- `id`: stable `JCORE-YYYY-NNNN` identifier;
- `kind`: `jcore`;
- `slug`: equal to the stable ID;
- localized `title`, `abstract`, and `keywords`;
- `bodyLanguage`;
- ordered author references;
- controlled `articleType`;
- `status`: `published` for public MVP records;
- `volume`, `issue`, and publication year;
- received, accepted, and published dates;
- publication events;
- license and copyright statement;
- optional DOI, PDF, code, dataset, and supplementary resources;
- normalized body path;
- `demo: true` for every fictional MVP publication.

No demonstration record may imply real peer review, affiliation, DOI registration, or publication history. Demonstration dates must be no later than August 23, 2026.

### 6.3 External Article

Required fields:

- `kind`: `external`;
- stable human-readable slug;
- localized title, abstract, and keywords when translations are supplied;
- original authors and affiliations as bibliographic contributors;
- original venue or research organization;
- original publication date;
- DOI and/or arXiv identifier;
- official landing-page URL;
- full rights statement, license identifier, license URL, copyright holder, and evidence URL;
- source-format provenance and retrieval date;
- checksum for every imported source package;
- normalized body path;
- `notPublishedByJCORE: true`.

External records use `/articles/external/<slug>/` and never receive a JCORE article ID, volume, or issue. The Articles index may list them alongside JCORE records, but every listing, search result, article header, citation panel, and download area must display `External Open-Access Article`, original source, rights information, and `Not published by JCORE`.

External bibliographic contributors do not automatically become JCORE author entities. A dedicated bibliographic contributor model prevents the site from representing an external author as a JCORE-published author.

### 6.4 Issue

Required fields:

- stable issue ID;
- volume, issue, and year;
- localized title and optional editorial text;
- publication date;
- demonstration-state flag.

Issue pages derive their article lists from JCORE article relationships. External articles cannot belong to an issue.

### 6.5 Publication Event

Supported public event types are `submitted`, `revised`, `accepted`, and `version-of-record`. Events contain a date and optional localized note. Git commits are never exposed as scholarly versions.

Correction and retraction data structures must remain extensible, but full correction/retraction publication workflows are outside the MVP.

### 6.6 Selection

A lightweight selection record may relate an external article to a bilingual editorial note and ordering value. This supports featured external research without changing ownership or publication status.

## 7. Import and Normalization Pipeline

The public site reads only normalized, validated content. Import is an editorial command executed locally or in CI.

### 7.1 Import Manifest

Every import begins with a manifest containing:

- source type: `latex`, `jats`, or `doi`;
- article kind and target slug;
- official identifier and official URL;
- source-package location or discovery instructions;
- expected license identifier and evidence URL;
- retrieval date;
- expected checksum when a source is already vendored;
- translation overrides;
- asset and PDF policy.

### 7.2 LaTeX Adapter

The adapter identifies one declared root document and resolves only files within the source package. It maps headings, paragraphs, equations, figures, tables, footnotes, code, citations, bibliography entries, and supplementary links to the normalized representation.

Unsafe TeX commands, shell escape, absolute paths, path traversal, missing bibliography entries, missing assets, and ambiguous root documents are fatal errors.

### 7.3 JATS Adapter

The adapter maps `article-meta`, contributor groups, affiliations, abstracts, permissions, sections, figures, tables, footnotes, and reference lists. The parser uses XML APIs and rejects external entity resolution. Missing rights information or invalid cross-references are fatal errors.

### 7.4 DOI/Link Adapter

The DOI adapter resolves bibliographic metadata and discovers an official open source. DOI metadata alone is insufficient for a rendered full-text record. Publication proceeds only when the pipeline also obtains an authorized LaTeX or JATS source package with machine-verifiable provenance and rights evidence.

The pipeline must not scrape a paywalled publisher page, bypass access controls, or infer redistribution permission from public readability. If a candidate fails, the editorial workflow selects a replacement article rather than downgrading the record to an incomplete full-text page.

### 7.5 PDF Handling

PDF is never parsed into the canonical body in the MVP. A PDF is vendored only when its license expressly permits redistribution; otherwise the page links to the official PDF. The MVP does not generate JCORE-branded PDFs.

### 7.6 Deterministic Output

Import output includes normalized metadata, normalized body, assets, provenance, and an import report. Running the same adapter against the same pinned source must produce equivalent output. Generated content is reviewed and committed to Git before publication.

## 8. External Article Corpus

The target corpus contains six real external articles:

- three representative works in artificial intelligence, machine learning, or Transformer research;
- one DeepSeek research article;
- one Moonshot AI/Kimi research article;
- one article from another leading laboratory, initially Qwen unless licensing or source quality requires a replacement.

Initial editorial candidates are:

- *Attention Is All You Need*;
- *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*;
- *FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness*;
- *DeepSeek-V3 Technical Report*;
- *Kimi k1.5: Scaling Reinforcement Learning with LLMs*;
- *Qwen2.5 Technical Report*.

These titles are candidates, not a promise of redistribution. Before inclusion, each must pass source, provenance, license, asset, and conversion checks. A failure triggers replacement by a thematically comparable article with an explicit open license and supported full-text source. The site must never ship a rights-ambiguous full text merely to preserve a title list.

## 9. Page System

### 9.1 Homepage

The homepage establishes JCORE as a journal without a marketing-style hero. It includes journal identity, current demonstration issue, latest JCORE articles, featured research, clearly labeled external open-access articles, research categories, and restrained submission status.

### 9.2 Articles Index

The index is derived from content collections and supports static client-side filtering by ownership, article type, category, year, and keyword. JCORE and external records share scanning patterns but use visibly different provenance labels.

### 9.3 Article Page

The reading page provides:

- ownership and provenance notice;
- title, authors, affiliations, article type, and keywords;
- bilingual abstract where available;
- article information and dates;
- table of contents;
- semantic full text;
- equations, figures, tables, footnotes, code, and references;
- code, dataset, PDF, and supplementary links;
- citation exports;
- publication-event timeline for JCORE records;
- related articles.

All imported sources render through one JCORE typographic system. The source publisher's visual design is not reproduced. An original PDF may remain available or linked as a source artifact.

### 9.4 Authors

The author index and detail pages cover JCORE author entities and derive article relations at build time. Fictional authors are visibly marked as demonstration data.

### 9.5 Issues

The issue archive groups issues by volume. An issue page groups JCORE articles by article type and never includes external articles.

### 9.6 Search

Pagefind indexes built pages after Astro generation. English and Chinese views expose language-appropriate UI and search scopes. Search covers title, authors, abstract, keywords, JCORE ID, DOI, and arXiv identifier. Results preserve ownership labels.

### 9.7 Institutional Pages

The MVP includes bilingual About, Submit, Editorial Board, and Policies pages. Submit describes preparation, screening, review, revision, decision, and publication, but states that private submission is not yet open. GitHub links are limited to corrections, code, and data contributions.

The editorial board is explicitly marked as a demonstration state and contains no invented real members. Policies are usable editorial drafts and cover peer review, ethics, authorship, conflict of interest, AI use, copyright, licensing, data, code, reproducibility, corrections, and retractions. AI cannot be listed as an author.

## 10. Citation and Scholarly Metadata

Every article provides derived plain-text, BibTeX, and RIS citations. External citations name the original venue, not JCORE. JCORE demonstration citations include an explicit demonstration marker and omit unregistered DOI fields.

Each article page produces:

- canonical URL and language alternates;
- Open Graph metadata;
- JSON-LD `ScholarlyArticle` data;
- Highwire/Google Scholar-style citation meta tags;
- publication date, authors, original journal or JCORE title, PDF URL when legal, DOI when present, and license metadata.

Metadata is derived from the article contract, not duplicated manually in templates.

## 11. Design System

The visual direction is traditional scholarly publishing with a modern digital reading experience.

- Source Serif 4 is the primary reading face.
- A restrained sans-serif face serves navigation, metadata, controls, and labels.
- White or warm-white backgrounds, near-black body text, neutral secondary text, fine borders, and one restrained accent color form the palette.
- Article measure, line height, paragraph rhythm, heading hierarchy, captions, equations, and references receive priority.
- Cards are limited to genuinely repeated records and remain compact with no nested-card composition.
- The interface excludes gradients, glass effects, oversized heroes, excessive rounding, dashboard composition, decorative animation, and generic AI-startup styling.

The site must remain readable and collision-free at mobile, tablet, laptop, and wide desktop sizes. Fixed-format controls use stable dimensions, and no font size scales directly with viewport width.

## 12. Validation and Error Handling

The publication pipeline is strict. These conditions block publication:

- schema violations;
- duplicate IDs or slugs;
- missing authors, issues, resources, citations, or translations required by the record;
- JCORE records without valid issue relations;
- external records with a JCORE ID or issue relation;
- absent or unverified rights evidence for vendored full text or PDF;
- unresolved LaTeX/JATS cross-references;
- unsafe paths, XML external entities, or unsupported TeX execution;
- broken internal links or missing assets;
- failed build, typecheck, lint, tests, or browser smoke checks.

Errors name the manifest, source path, field or node, and corrective action. The static site never renders a partially imported article as published content.

## 13. Testing and Release Gates

Automated checks cover:

- Zod schema acceptance and rejection cases;
- content uniqueness and cross-collection relationships;
- LaTeX and JATS fixture conversion;
- DOI metadata normalization with recorded fixtures rather than live-network unit tests;
- license and provenance rules;
- citation, RIS, JSON-LD, and meta-tag generation;
- bilingual route and alternate-link generation;
- JCORE versus external ownership presentation;
- Pagefind index generation and representative searches;
- Astro build and type checking;
- linting and formatting;
- broken internal links and missing static resources;
- Playwright desktop and mobile smoke tests;
- automated accessibility checks on representative pages.

CI performs deterministic tests without requiring paid services. Network-dependent import discovery is a separate editorial command whose normalized result is committed before the normal publication build.

## 14. GitHub and Deployment

After specification approval, initialize a `main` Git repository using the existing global Git identity and create a GitHub repository through the authenticated `gh` CLI account. The default remote repository visibility is public because GitHub Pages, open content provenance, and external rights notices are core to the product; repository creation must not overwrite an existing remote repository with the same name.

The initial deployment targets GitHub Project Pages. `site` and `base` values derive from repository configuration so a future custom domain does not require route rewrites. GitHub Actions validates, builds, creates the Pagefind index, uploads the Pages artifact, and deploys it.

## 15. Explicitly Out of Scope

The MVP does not include:

- accounts, roles, sessions, or a runtime CMS;
- a database or fake API;
- private manuscript upload or online peer-review workflows;
- a simulated editorial dashboard;
- DOI registration or Crossref deposit;
- automatic PDF-to-HTML conversion;
- JCORE-branded PDF generation;
- unrestricted publisher-page scraping;
- complete correction, retraction, and replacement publication workflows;
- payment, subscription, analytics, or notification systems;
- claims that demonstration content has undergone real peer review.

## 16. Success Criteria

The MVP is complete when a clean checkout can install dependencies, validate all content, build a fully static bilingual journal, generate static search, pass automated tests, and deploy to GitHub Pages; readers can distinguish JCORE demonstration publications from six legally imported external articles at every discovery and reading surface; and editors can add a supported LaTeX, JATS, or DOI-based source through a documented, strict repository workflow without changing a page template.
