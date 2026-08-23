import { describe, expect, it } from 'vitest';
import { buildArticleMetadata } from '../../src/lib/metadata';
import { makeExternalArticle, makeValidIndex } from '../fixtures/validation/records';

describe('scholarly metadata', () => {
  it('builds JCORE article metadata', () => {
    const site = new URL('https://journal.example/JCORE');
    const metadata = buildArticleMetadata(makeValidIndex().articles[0], 'en', site);
    expect(metadata.jsonLd['@type']).toBe('ScholarlyArticle');
    expect(metadata.citation.citation_journal_title).toBe('JCORE');
    expect(metadata.alternates).toHaveLength(2);
    expect(metadata.canonical.href).toContain('/en/articles/JCORE-2026-0001/');
  });

  it('builds external article metadata with original venue', () => {
    const site = new URL('https://journal.example/JCORE');
    const metadata = buildArticleMetadata(makeExternalArticle(), 'zh', site);
    expect(metadata.jsonLd['@type']).toBe('ScholarlyArticle');
    expect(metadata.citation.citation_journal_title).toContain('NeurIPS');
    expect(metadata.canonical.href).toContain('/zh/articles/external/attention-is-all-you-need/');
  });
});
