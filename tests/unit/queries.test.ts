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
    expect(getPublishedArticles()).toHaveLength(2);
    expect(getExternalArticleBySlug('attention-is-all-you-need')?.title.en).toContain('Attention');
  });

  it('joins authors and issues without mixing external articles into issues', () => {
    expect(getAuthorById('demo-author-002')).toBeDefined();
    expect(getArticlesForAuthor('demo-author-002')).toHaveLength(2);
    expect(getArticlesForIssue('volume-1-issue-1')).toHaveLength(2);
    expect(getArticleById('JCORE-2026-0001')?.id).toBe('JCORE-2026-0001');
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
