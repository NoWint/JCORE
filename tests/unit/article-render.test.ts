import { describe, expect, it } from 'vitest';
import { renderArticle } from '../../src/lib/article/render';

describe('article rendering', () => {
  it('keeps explicit heading labels and shares ids with the toc index', async () => {
    const report = await renderArticle('# Methods {#sec:methods}\n\n## Setup', { base: '/JCORE' });

    expect(report.headings.map((heading) => heading.id)).toEqual(['sec-methods', 'setup']);
    expect(report.html).toContain('<h1 id="sec-methods">Methods</h1>');
    expect(report.html).toContain('<h2 id="setup">Setup</h2>');
  });

  it('deduplicates repeated explicit labels deterministically', async () => {
    const report = await renderArticle(
      '# Results {#sec:results}\n\n## Results {#sec:results}\n\nSee [first](#sec:results).',
    );

    expect(report.headings.map((heading) => heading.id)).toEqual(['sec-results', 'sec-results-2']);
    expect(report.html).toContain('href="#sec-results"');
  });

  it('does not emit Pandoc fences, KaTeX error markup, or broken internal hrefs', async () => {
    const report = await renderArticle(
      '::: algorithmic\n\n## Algorithm {#alg:one}\n\n$$\n\\begin{equation*}x=1\\end{equation*}\n$$\n\nSee [Algorithm](#alg:missing).\n\n:::',
    );

    expect(report.html).not.toContain(':::');
    expect(report.html).not.toContain('katex-error');
    expect(report.html).not.toContain('href="#alg:missing"');
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain('unresolved-reference');
  });

  it('wraps a bare display environment before KaTeX processing', async () => {
    const report = await renderArticle('\\begin{equation*}x=1\\end{equation*}');

    expect(report.html).not.toContain('katex-error');
    expect(report.html).toContain('katex-display');
  });

  it('converts simple whitespace tables and records media references', async () => {
    const report = await renderArticle(
      'Name  Score\n-----  -----\nAlice  9\n\n![Latency](/figures/paper/chart.pdf)',
      { base: '/JCORE' },
    );

    expect(report.html).toContain('<table>');
    expect(report.html).toContain('/JCORE/figures/paper/chart.pdf');
    expect(report.media).toEqual([{ src: '/JCORE/figures/paper/chart.pdf', kind: 'image' }]);
  });

  it('assigns explicit figure ids so figure references resolve', async () => {
    const report = await renderArticle(
      '![Chart](/figures/paper/chart.png){#fig:chart}\n\nSee [Figure](#fig:chart).',
      { base: '/JCORE' },
    );

    expect(report.html).toContain('id="fig-chart"');
    expect(report.html).toContain('href="#fig-chart"');
  });
});
