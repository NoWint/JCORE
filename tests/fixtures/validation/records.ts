import type { CollectionIndex, ExternalArticleRecord } from '../../../src/lib/content/types';

export function makeExternalArticle(overrides: Partial<ExternalArticleRecord> = {}): ExternalArticleRecord {
  return {
    kind: 'external',
    slug: 'attention-is-all-you-need',
    title: { en: 'Attention Is All You Need' },
    abstract: { en: 'A Transformer architecture based solely on attention mechanisms.' },
    keywords: [{ en: 'attention' }, { en: 'transformer' }],
    bodyLanguage: 'en',
    renderMode: 'structured',
    sourceFormat: 'manual',
    sourceFiles: [],
    conversion: {
      status: 'converted',
      importer: 'manual',
      outputChecksum: '0'.repeat(64),
      reportPath: 'import-report.json'
    },
    contributors: [{ name: 'Ashish Vaswani', affiliation: 'Google Brain' }],
    originalVenue: 'NeurIPS 2017',
    originalPublicationDate: new Date('2017-12-04'),
    identifiers: { arxiv: '1706.03762' },
    officialUrl: 'https://arxiv.org/abs/1706.03762',
    rights: {
      license: {
        id: 'arxiv-nonexclusive-distrib',
        url: 'https://arxiv.org/licenses/nonexclusive-distrib/1.0/'
      },
      copyrightHolder: 'The Authors',
      statement: 'Redistribution permitted under the arXiv non-exclusive license.',
      evidenceUrl: 'https://arxiv.org/abs/1706.03762',
      permitsRedistribution: true
    },
    provenance: {
      sourceFormat: 'latex',
      retrievalDate: new Date('2026-08-23'),
      checksum: 'a'.repeat(64),
      sourcePackagePath: 'sources/latex/1706.03762',
      importer: 'jcore-import@0.1.0'
    },
    body: '# Introduction\n\nAttention is all you need.',
    notPublishedByJCORE: true,
    ...overrides
  };
}

export function makeValidIndex(): CollectionIndex {
  return {
    articles: [
      {
        kind: 'jcore',
        id: 'JCORE-2026-0001',
        title: { en: 'Demonstration Article', zh: '演示论文' },
        abstract: { en: 'A demonstration article.', zh: '一篇演示论文。' },
        keywords: [{ en: 'demonstration' }],
        bodyLanguage: 'en',
        renderMode: 'structured',
        sourceFormat: 'manual',
        sourceFiles: [],
        conversion: {
          status: 'converted',
          importer: 'manual',
          outputChecksum: '0'.repeat(64),
          reportPath: 'import-report.json'
        },
        authors: [{ authorId: 'demo-author-001', order: 1 }],
        articleType: 'replication-study',
        status: 'published',
        volume: 1,
        issue: 1,
        year: 2026,
        dates: {
          received: new Date('2026-08-01'),
          accepted: new Date('2026-08-15'),
          published: new Date('2026-08-20')
        },
        events: [
          { type: 'submitted', date: new Date('2026-08-01') },
          { type: 'accepted', date: new Date('2026-08-15') },
          { type: 'version-of-record', date: new Date('2026-08-20') }
        ],
        license: {
          id: 'cc-by-4.0',
          url: 'https://creativecommons.org/licenses/by/4.0/',
          holder: 'JCORE demonstration authors',
          statement: 'Demonstration content for the JCORE MVP.'
        },
        demo: true,
        body: '# Introduction\n\nThis is demonstration content.'
      }
    ],
    externalArticles: [makeExternalArticle()],
    authors: [
      {
        kind: 'author',
        id: 'demo-author-001',
        name: { en: 'Alex Demo', zh: '亚历克斯' },
        affiliations: [{ id: 'demo-institute', name: { en: 'Demo Institute' } }],
        demo: true
      }
    ],
    issues: [
      {
        kind: 'issue',
        id: 'volume-1-issue-1',
        volume: 1,
        issue: 1,
        year: 2026,
        title: { en: 'Volume 1 Issue 1', zh: '第一卷第一期' },
        published: new Date('2026-08-20'),
        demo: true
      }
    ],
    selections: []
  };
}
