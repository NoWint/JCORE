import type { ImportManifest } from '../../../../scripts/import/manifest';

export const validManifest: ImportManifest = {
  sourceType: 'latex',
  articleKind: 'external',
  targetSlug: 'attention-is-all-you-need',
  officialIdentifier: '1706.03762',
  officialUrl: 'https://arxiv.org/abs/1706.03762',
  sourcePackagePath: 'sources/latex/1706.03762',
  rootDocument: 'main.tex',
  expectedChecksum: 'a'.repeat(64),
  retrievalDate: '2026-08-23',
  rights: {
    licenseId: 'arxiv-nonexclusive-distrib',
    licenseUrl: 'https://arxiv.org/licenses/nonexclusive-distrib/1.0/',
    copyrightHolder: 'The Authors',
    statement: 'Redistribution permitted under the arXiv non-exclusive license.',
    evidenceUrl: 'https://arxiv.org/abs/1706.03762',
    permitsRedistribution: true
  },
  importerVersion: 'jcore-import@0.1.0'
};
