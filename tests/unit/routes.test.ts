import { describe, expect, it } from 'vitest';
import { alternateLinks, canonicalForRecord, makeRoute } from '../../src/lib/routes';

describe('route helpers', () => {
  it('builds locale routes without duplicate segments', () => {
    expect(makeRoute('en', 'articles')).toBe('/en/articles/');
    expect(makeRoute('zh', 'articles/JCORE-2026-0001')).toBe('/zh/articles/JCORE-2026-0001/');
    expect(makeRoute('en', 'en/articles', '/JCORE')).toBe('/JCORE/en/articles/');
  });

  it('builds canonical and alternate scholarly URLs', () => {
    const site = new URL('https://journal.example/JCORE');
    const article = { kind: 'jcore' as const, id: 'JCORE-2026-0001' };
    expect(canonicalForRecord(article, site, 'en').toString()).toBe(
      'https://journal.example/JCORE/en/articles/JCORE-2026-0001/'
    );
    const alternates = alternateLinks(article, site);
    expect(alternates.map((alternate) => alternate.lang)).toEqual(['en', 'zh']);
    expect(alternates.every((alternate) => alternate.href.href.includes('/articles/JCORE-2026-0001/'))).toBe(true);
  });

  it('uses external routes for external records', () => {
    const site = new URL('https://journal.example');
    const external = { kind: 'external' as const, slug: 'deepseek-v3-technical-report' };
    expect(canonicalForRecord(external, site, 'zh').toString()).toBe(
      'https://journal.example/zh/articles/external/deepseek-v3-technical-report/'
    );
  });
});
