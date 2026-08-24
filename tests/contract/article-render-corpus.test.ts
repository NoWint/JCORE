import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../src/lib/article/render';
import { validateArticleCorpus, validateRenderedArticle } from '../../src/lib/article/quality';
import { loadContent } from '../../scripts/validate/content';

const base = '/JCORE';

describe('article render corpus', () => {
  it('renders all eight papers without fatal article-quality diagnostics', async () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const reports = await Promise.all(
      [...index.articles, ...index.externalArticles].map((record) =>
        renderArticle(record.body, { base }),
      ),
    );

    for (const report of reports) {
      expect(validateRenderedArticle(report, 'body.md')).toEqual([]);
      expect(report.html).not.toMatch(/:::\s|reference-type=|class="katex-error"/);

      const ids = [...report.html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('returns no fatal diagnostics for the entire repository', async () => {
    const { index } = loadContent(process.cwd());
    const diagnostics = await validateArticleCorpus(index, base);

    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
