# Importing Articles

The public site only reads normalized, validated content. Raw LaTeX, JATS XML, and DOI discovery are handled by the editorial import pipeline before content is committed.

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

- LaTeX packages are scanned for unsafe paths, shell escape, missing assets, missing bibliography files, and unresolved citations before Pandoc conversion.
- JATS XML is parsed with external entities disabled; missing permissions, duplicate IDs, broken cross-references, and missing graphics are fatal.
- DOI resolution is an offline editorial command whose recorded result is committed before a normal build.

## Workflow

1. Place the source package and record an import manifest under `sources/manifests/`.
2. Run the import adapters to produce normalized `index.md`, `body.md`, provenance, and assets.
3. Review the generated content and commit it.
4. Run `npm run validate`, then `npm run check`.

PDF is treated as a source artifact only. The MVP never derives canonical HTML from PDF and never generates JCORE-branded PDFs.
