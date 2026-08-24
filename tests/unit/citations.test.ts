import { describe, expect, it } from 'vitest';
import { formatBibTeX, formatPlainCitation, formatRIS } from '../../src/lib/citations';
import { makeExternalArticle, makeValidIndex } from '../fixtures/validation/records';

describe('citation outputs', () => {
  it('formats external citations with original source and ownership note', () => {
    const record = makeExternalArticle();
    expect(formatPlainCitation(record, 'en')).toContain('arXiv:1706.03762');
    expect(formatPlainCitation(record, 'en')).toContain('not published by JCORE');
    expect(formatBibTeX(record)).toContain('@misc{attention-is-all-you-need');
    expect(formatBibTeX(record)).toContain('External open-access article');
    expect(formatRIS(record)).toContain('TY  - ELEC');
    expect(formatRIS(record)).toContain('ER  - ');
  });

  it('formats JCORE citations with journal metadata', () => {
    const record = { ...makeValidIndex().articles[0], demo: false };
    expect(formatPlainCitation(record, 'en')).toContain('JCORE');
    expect(formatBibTeX(record)).toContain('@article{JCORE-2026-0001');
    expect(formatBibTeX(record)).toContain('journal = {JCORE}');
    expect(formatBibTeX(record)).not.toContain('note = {Demonstration article.}');
    expect(formatRIS(record)).toContain('JO  - JCORE');
  });
});
