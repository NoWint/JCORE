import { describe, expect, it } from 'vitest';
import { loadContent } from '../../scripts/validate/content';

describe('demo corpus', () => {
  it('matches the JCORE demonstration corpus contract', () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(index.issues).toHaveLength(1);
    expect(index.authors).toHaveLength(10);
    expect(index.articles).toHaveLength(2);
    expect(index.articles.every((article) => article.articleType === 'replication-study')).toBe(true);
    expect(index.articles.every((article) => article.demo)).toBe(true);
    expect(index.articles.every((article) => !article.doi)).toBe(true);
    expect(index.articles.every((article) => article.dates.published.toISOString().slice(0, 10) <= '2026-08-23')).toBe(true);
  });
});
