import { describe, expect, it } from 'vitest';
import {
  articleMetadataSchema,
  authorSchema,
  externalArticleMetadataSchema,
  issueMetadataSchema,
  selectionSchema
} from '../../src/lib/content/contracts';
import { makeExternalArticle, makeValidIndex } from '../fixtures/validation/records';

function withoutBody<T extends { body: string }>(record: T): Omit<T, 'body'> {
  const { body, ...metadata } = record;
  void body;
  return metadata;
}

describe('content contracts', () => {
  it('accepts a valid JCORE article', () => {
    expect(articleMetadataSchema.safeParse(withoutBody(makeValidIndex().articles[0])).success).toBe(true);
  });

  it('rejects a JCORE article with a non-stable ID', () => {
    const article = { ...withoutBody(makeValidIndex().articles[0]), id: 'article-1' };
    expect(articleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('rejects an article missing the English title', () => {
    const article = { ...withoutBody(makeValidIndex().articles[0]), title: { zh: '演示论文' } };
    expect(articleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('rejects duplicate author order values', () => {
    const article = {
      ...withoutBody(makeValidIndex().articles[0]),
      authors: [
        { authorId: 'demo-author-001', order: 1 },
        { authorId: 'demo-author-002', order: 1 }
      ]
    };
    expect(articleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('accepts a valid external article', () => {
    expect(externalArticleMetadataSchema.safeParse(withoutBody(makeExternalArticle())).success).toBe(true);
  });

  it('rejects an external article that claims JCORE publication', () => {
    const article = { ...withoutBody(makeExternalArticle()), notPublishedByJCORE: false };
    expect(externalArticleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('rejects unknown JCORE issue fields on external articles', () => {
    const article = { ...withoutBody(makeExternalArticle()), issue: 1 } as unknown;
    expect(externalArticleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('rejects an external article without rights evidence', () => {
    const article = {
      ...withoutBody(makeExternalArticle()),
      rights: { ...makeExternalArticle().rights, evidenceUrl: 'not-a-url' }
    };
    expect(externalArticleMetadataSchema.safeParse(article).success).toBe(false);
  });

  it('accepts valid author, issue, and selection records', () => {
    const index = makeValidIndex();
    expect(authorSchema.safeParse(index.authors[0]).success).toBe(true);
    expect(issueMetadataSchema.safeParse(index.issues[0]).success).toBe(true);
    const selection = {
      kind: 'selection',
      id: 'featured-attention',
      title: { en: 'Featured Attention' },
      externalArticleSlug: 'attention-is-all-you-need',
      editorialNote: { en: 'A landmark paper.' },
      order: 0
    };
    expect(selectionSchema.safeParse(selection).success).toBe(true);
  });
});
