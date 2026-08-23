import { describe, expect, it } from 'vitest';
import { validatePublication } from '../../scripts/validate/publication';
import type { ExternalArticleRecord } from '../../src/lib/content/types';
import { makeExternalArticle, makeValidIndex } from '../fixtures/validation/records';

function codes(diagnostics: ReturnType<typeof validatePublication>): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe('publication validator', () => {
  it('accepts a fully related index', () => {
    expect(validatePublication(makeValidIndex())).toEqual([]);
  });

  it('rejects duplicate article IDs', () => {
    const index = makeValidIndex();
    index.articles.push({ ...index.articles[0], id: 'JCORE-2026-0002', body: 'Second' });
    index.articles[0].id = 'JCORE-2026-0002';
    expect(codes(validatePublication(index))).toContain('article');
  });

  it('rejects an article with an unknown author', () => {
    const index = makeValidIndex();
    index.articles[0].authors = [{ authorId: 'missing-author', order: 1 }];
    expect(codes(validatePublication(index))).toContain('missing-author');
  });

  it('rejects an article with an unknown issue', () => {
    const index = makeValidIndex();
    index.articles[0].issue = 2;
    expect(codes(validatePublication(index))).toContain('missing-issue');
  });

  it('rejects demonstration articles with future dates', () => {
    const index = makeValidIndex();
    index.articles[0].dates.published = new Date('2026-08-30');
    expect(codes(validatePublication(index))).toContain('demo-future-date');
  });

  it('rejects demonstration articles with a DOI', () => {
    const index = makeValidIndex();
    index.articles[0].doi = '10.0000/demo';
    expect(codes(validatePublication(index))).toContain('demo-doi');
  });

  it('rejects external full text without redistribution rights', () => {
    const index = makeValidIndex();
    index.externalArticles[0].rights.permitsRedistribution = false;
    expect(codes(validatePublication(index))).toContain('rights-denied');
  });

  it('rejects external articles carrying an issue relation', () => {
    const index = makeValidIndex();
    const invalid = {
      ...makeExternalArticle(),
      issue: 1
    } as unknown as ExternalArticleRecord;
    index.externalArticles = [invalid];
    expect(codes(validatePublication(index))).toContain('external-issue');
  });

  it('rejects a selection pointing at a missing external article', () => {
    const index = makeValidIndex();
    index.selections = [
      {
        kind: 'selection',
        id: 'missing-target',
        title: { en: 'Missing Target' },
        externalArticleSlug: 'not-in-corpus',
        editorialNote: { en: 'A missing reference.' },
        order: 0
      }
    ];
    expect(codes(validatePublication(index))).toContain('missing-selection-target');
  });

  it('rejects empty article bodies', () => {
    const index = makeValidIndex();
    index.articles[0].body = '';
    expect(codes(validatePublication(index))).toContain('empty-body');
  });
});
