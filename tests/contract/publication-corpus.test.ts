import { describe, expect, it } from 'vitest';
import { loadContent } from '../../scripts/validate/content';

describe('publication corpus', () => {
  it('matches the current first-issue publication contract', () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(index.issues).toHaveLength(1);
    expect(index.authors).toHaveLength(2);
    expect(index.articles).toHaveLength(2);
    expect(index.authors.map((author) => author.id).sort()).toEqual(['nowint', 'tiantianyzj']);
    expect(index.articles.map((article) => article.id).sort()).toEqual([
      'JCORE-2026-0001',
      'JCORE-2026-0002',
    ]);
    expect(index.articles.map((article) => article.authors[0]?.authorId).sort()).toEqual([
      'nowint',
      'tiantianyzj',
    ]);
    expect(index.articles.some((article) => article.title.en.includes('ChatMail'))).toBe(true);
    expect(index.articles.some((article) => article.title.en.includes('PEYT Chat'))).toBe(true);
    expect(index.articles.every((article) => article.articleType === 'research-note')).toBe(true);
    expect(index.articles.every((article) => article.demo === false)).toBe(true);
    expect(index.articles.every((article) => article.doi === undefined)).toBe(true);
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0001')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-20'
    );
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0002')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-24'
    );
  });
});
