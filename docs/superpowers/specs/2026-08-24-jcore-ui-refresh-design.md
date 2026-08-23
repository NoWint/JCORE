# JCORE UI Refresh Design

**Date:** 2026-08-24
**Status:** Approved

## 1. Summary

Redesign the JCORE interface to read like a leading research journal (Science.org editorial style). The current amber-tinted design is replaced with a single restrained accent color, a serif masthead, editorial hierarchy, and a three-column article page. The user approved the direction and asked for implementation to follow the approved mockups directly.

## 2. Design Direction

### 2.1 Visual Language

- White page, near-black ink text, neutral gray metadata, thin hairline separators.
- Exactly **one** accent color: Science red `#B00`. It is used only for category labels, dates, article-type labels, active links, citation links, the `EXPLORE` action, and small editorial markers. It never colors large surfaces.
- Hierarchy comes from type size, weight, and spacing, not from color variety.
- Serif headings and article prose (Source Serif 4). Sans-serif metadata, navigation, controls, and labels (IBM Plex Sans).
- No borders on nav, no card framing on repeated text rows, no decorative images, no color gradients, no shadow piles.

### 2.2 Typography

- Masthead wordmark: large serif `JCORE`.
- Section headings: small sans-serif uppercase labels (e.g. `FIRST RELEASE`, `LATEST PAPERS`) with a thin black rule beneath.
- Article title and lead text: serif, tight letter-spacing, near-black.
- Metadata, authors, dates, DOI-like volume/issue lines: sans-serif gray.
- Body text measure stays readable; line-height roughly `1.7`.

### 2.3 Theme

- Light theme: `#fff` surfaces, `#1a1a1a` ink, `#565a60` secondary, `#e2e2e2` hairline, `#f6f6f6` editorial panel, `#B00` accent.
- Dark theme: near-black `#0d0d0f` surfaces, `#f4f4f4` ink, `#9b9ba0` secondary, `#26262a` hairline, `#f6f6f6` panel becomes `#1c1c1f`, accent stays dark red `#d33` for contrast.
- Theme follows system `prefers-color-scheme` and also supports manual toggle. Toggle stores preference and applies toggled class.

## 3. Components

### 3.1 Site Masthead (new)

Two-part header.

Top masthead:

- Left: hamburger icon (`︿` style used for the drawer at narrower widths).
- Center: serif `JCORE` wordmark, full site name hidden.
- Right: search icon (routes to search), language switch, red `EXPLORE` pill.

Station bar:

- Left nav: `Articles`, `Issues`, `Authors`, `Submit`, `About`, `Policies`.
- Right: red `GET THE LATEST PAPERS` link that routes to the current issue.

The station bar replaces the prior boxed nav. Mobile collapses to the hamburger-only masthead with the drawer still accessible via the same navigation.

### 3.2 Site Footer (simplified)

- Single hairline rule.
- Left: `JCORE` serif title plus the full journal name.
- Right: site author `GitHub/NoWint` with a link to the GitHub repository, and the year.
- No feature list, no newsletter, no social stack.

### 3.3 Article Type

Article-type identifiers map to editorial labels:

- `research-article` → `Research Article`
- `review-article` → `Review Article`
- `research-note` → `Research Note`
- `replication-study` → `Replication Study`
- `external` → `External Article`

The label is the red uppercase kicker on cards and on article headers.

### 3.4 OwnershipBadge

Kept but restyled as a thin bordered marker, never a filled pill.

- JCORE records: `JCORE Article`.
- External records: `External Article` plus `Not published by JCORE`, and the original venue/link in the rights panel.
- Demo records keep an explicit `Demonstration` marker.

## 4. Pages

### 4.1 Homepage

Editorial layout driven by existing queries:

- Masthead and station bar.
- **Lead article**: the most recently published JCORE article rendered as a full-width editorial lead with red category kicker, serif headline, authors, and date. Follows the confirmed visual with an image-free, editorial-panel treatment using the gray `#f6f6f6` backdrop.
- **First release**: a two-column primary list of the remaining recent articles, each row showing red category, gray date on the right, serif title, and authors. No cards.
- **Latest papers rail**: a narrow right rail listing the six featured external articles as text rows with a red category label and gray date.
- The homepage removes the boxed category grid, the `journal-intro` hero, and the boxed cards.

### 4.2 Articles Index

- Page title in serif, short sans lede.
- Filters preserved (ownership, type) but restyled as plain select controls with a hairline.
- Article rows use the same editorial row style as homepage list items, with a red article-type label and gray date.

### 4.3 Article Page (three-column)

- Header block is centered: red article-type kicker, serif title, sans authors, volume/issue date, then a centered abstract on hairline rules.
- `Left rail`: numbered **Table of contents** from extracted headings, plus received/accepted dates for JCORE records.
- `Center`: semantic article body in serif prose.
- `Right rail`: **Cite this paper** links (`Plain Text`, `BibTeX`, `RIS`), a source/rights block for external records, and **Related articles**.
- The header and abstract are no longer pinned left; cards are removed. The section is a grid of `230px | 1fr | 220px` with a responsive collapse to single column.

### 4.4 Institutional And Archive Pages

The remaining pages (issues, authors, submit, about, editorial board, policies, search) keep their existing content and route behavior. They adopt the new tokens and the simplified masthead and footer.

## 5. Data And Routing

No content schema, routing, or data-layer changes. All changes stay in:

- `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/typography.css`
- `src/layouts/SiteLayout.astro`, `src/layouts/ArticleLayout.astro`
- `src/components/site/SiteHeader.astro`, `SiteFooter.astro`, `OwnershipBadge.astro`
- `src/components/discovery/ArticleCard.astro`
- `src/pages/[lang]/index.astro`

## 6. Accessibility And Responsiveness

- Keep semantic headings and landmarks.
- Keep role/label on the navigation and language switch.
- Theme toggle exposes accessible state and keyboard focus.
- At `<= 720px`, the article grid collapses to one column (table of contents moves above the body, citation/related rail moves below), the station bar wraps or hides to the drawer, and homepage rails stack.
- Text must not overflow; fixed-width rails are constrained with `min-width: 0` and `overflow-wrap: anywhere` for the prose.

## 7. Rules Removed

The refresh removes the prior amber palette, the warm `#fbfaf7` background, the boxed card treatment for homepage sections and article cards, the uppercase serif card titles, and any remaining rounded or shadow-heavy control surfaces. It does not alter articles, authors, issues, citations, search, metadata, or deployment.

## 8. Out Of Scope

- No new routes, schemas, or data.
- No content changes.
- No marketing hero, imagery, or illustrated graphic assets.
