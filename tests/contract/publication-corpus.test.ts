import { describe, expect, it } from 'vitest';
import { loadContent } from '../../scripts/validate/content';

describe('publication corpus', () => {
  it('matches the current first-issue publication contract', () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(index.issues).toHaveLength(1);
    expect(index.authors).toHaveLength(3);
    expect(index.articles).toHaveLength(4);
    expect(index.authors.map((author) => author.id).sort()).toEqual(['anonymous', 'nowint', 'tiantianyzj']);
    expect(index.articles.map((article) => article.id).sort()).toEqual([
      'JCORE-2026-0001',
      'JCORE-2026-0002',
      'JCORE-2026-0003',
      'JCORE-2026-0004',
    ]);
    expect(index.articles.map((article) => article.authors[0]?.authorId).sort()).toEqual([
      'anonymous',
      'anonymous',
      'nowint',
      'tiantianyzj',
    ]);
    expect(index.articles.some((article) => article.title.en.includes('ChatMail'))).toBe(true);
    expect(index.articles.some((article) => article.title.en.includes('PEYT Chat'))).toBe(true);
    expect(index.articles.some((article) => article.title.en.includes('Safe Conservative GC'))).toBe(true);
    expect(index.articles.some((article) => article.title.en.includes('LDFC'))).toBe(true);
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0001')?.articleType).toBe('research-note');
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0002')?.articleType).toBe('research-note');
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0003')?.articleType).toBe('research-article');
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0004')?.articleType).toBe('research-article');
    expect(index.articles.every((article) => article.demo === false)).toBe(true);
    expect(index.articles.every((article) => article.doi === undefined)).toBe(true);
    expect(index.articles.every((article) => article.renderMode === 'structured')).toBe(true);
    expect(index.articles.every((article) => article.sourceFormat === 'pdf' || article.sourceFormat === 'markdown' || article.sourceFormat === 'manual')).toBe(true);
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0003')?.sourceFiles).toEqual([
      {
        path: '/sources/JCORE-2026-0003/Safe_Conservative_GC_Theory.pdf',
        label: 'Original PDF',
        kind: 'pdf',
      },
    ]);
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0004')?.sourceFiles).toEqual([
      {
        path: '/sources/JCORE-2026-0004/LDFC_Implementation_Vredrs_0_1_5.pdf',
        label: 'Original PDF',
        kind: 'pdf',
      },
    ]);
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0001')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-20'
    );
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0002')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-24'
    );
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0003')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-24'
    );
    expect(index.articles.find((article) => article.id === 'JCORE-2026-0004')?.dates.published.toISOString().slice(0, 10)).toBe(
      '2026-08-24'
    );
  });
});
