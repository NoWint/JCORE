# Importing Articles

The public site only reads normalized, validated content. The unified `jcore`
CLI turns PDF, LaTeX, JATS XML, Markdown, and recorded DOI sources into a
reviewable article bundle before content is committed.

## Rights Gate

Full text can be published only when all of the following are recorded:

- official identifier and URL;
- source format and package path;
- SHA-256 checksum;
- retrieval date;
- license identifier, license URL, copyright holder, rights statement, and evidence URL;
- explicit permission to redistribute the full text.

A DOI or link resolution that provides metadata only cannot emit a rendered full-text record.

## Supported Sources

- PDF files are converted with `pdftotext -layout` when available and the
  extracted text passes the article renderer preflight. Otherwise the original
  PDF is preserved in a source-fallback bundle.
- LaTeX packages are scanned for unsafe paths, shell escape, missing assets, missing bibliography files, and unresolved citations before Pandoc conversion.
- JATS XML is parsed with external entities disabled; missing permissions, duplicate IDs, broken cross-references, and missing graphics are fatal.
- Markdown files or directories containing `body.md` are normalized directly.
- DOI imports resolve only through a recorded, checksum-verified source package.

## Workflow

1. Place the source package and its manifest under an editorial workspace.
2. Inspect the source before importing:

   ```bash
   npm run jcore -- inspect path/to/paper.pdf --json
   npm run jcore -- inspect path/to/latex-package --json
   ```

3. Import into an atomic staging directory:

   ```bash
   npm run jcore -- import path/to/paper.pdf \
     --manifest path/to/manifest.yaml \
     --staging .jcore/staging
   ```

   A successful conversion emits `index.md`, `body.md`, assets, an
   `import-report.json`, and preserved files under `source/`. A failed but
   acknowledged conversion emits a valid `source-fallback` record without an
   empty `body.md`.

4. Review and validate the staged record:

   ```bash
   npm run jcore -- report .jcore/staging/paper
   npm run jcore -- validate .jcore/staging/paper
   ```

5. Promote only after review. Promotion refuses overwrite unless `--force` is
   explicit and mirrors preserved source files into `public/sources/`:

   ```bash
   npm run jcore -- promote .jcore/staging/paper \
     --content-root content/external-articles \
     --public-root public/sources
   ```

6. Run `npm run validate`, then `npm run check`.

The import report is part of the editorial record. It carries converter status,
checksums, and diagnostics so operators can distinguish a structured paper from
an original-source fallback without guessing from the page layout.
