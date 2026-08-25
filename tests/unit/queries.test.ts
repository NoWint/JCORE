import { describe, expect, it } from 'vitest';
import {
  getArticleById,
  getArticlesForAuthor,
  getArticlesForIssue,
  getAuthorById,
  getExternalArticleBySlug,
  getFeaturedExternalArticles,
  getIssues,
  getPublishedArticles
} from '../../src/lib/content/queries';

describe('content queries', () => {
  it('returns JCORE and external articles', () => {
    expect(getPublishedArticles()).toHaveLength(4);
    expect(getExternalArticleBySlug('attention-is-all-you-need')?.title.en).toContain('Attention');
  });

  it('joins authors and issues without mixing external articles into issues', () => {
    expect(getAuthorById('tiantianyzj')).toBeDefined();
    expect(getArticlesForAuthor('tiantianyzj')).toHaveLength(1);
    expect(getAuthorById('anonymous')).toBeDefined();
    expect(getArticlesForAuthor('anonymous')).toHaveLength(2);
    expect(getArticlesForIssue('volume-1-issue-1')).toHaveLength(4);
    expect(getArticleById('JCORE-2026-0001')?.id).toBe('JCORE-2026-0001');
    expect(getArticleById('JCORE-2026-0003')?.title.en).toContain('Safe Conservative GC');
    expect(getArticleById('JCORE-2026-0004')?.title.en).toContain('LDFC');
    expect(getIssues()).toHaveLength(1);
  });

  it('returns ordered featured external articles', () => {
    const featured = getFeaturedExternalArticles();
    expect(featured.map((article) => article.slug)).toEqual([
      'attention-is-all-you-need',
      'deepseek-v3-technical-report',
      'mooncake-kvcache-centric-disaggregated-architecture'
    ]);
  });
});
