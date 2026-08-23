import { describe, expect, it } from 'vitest';
import { loadContent } from '../../scripts/validate/content';

describe('external corpus', () => {
  it('contains six rights-tracked external full-text articles', () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(index.externalArticles).toHaveLength(6);
    expect(index.externalArticles.every((article) => article.notPublishedByJCORE)).toBe(true);
    expect(index.externalArticles.every((article) => article.body.length > 100)).toBe(true);
    expect(index.externalArticles.every((article) => article.rights.permitsRedistribution)).toBe(true);
    expect(index.externalArticles.every((article) => article.provenance.checksum.length === 64)).toBe(true);

    const slugs = index.externalArticles.map((article) => article.slug);
    expect(slugs).toContain('attention-is-all-you-need');
    expect(slugs).toContain('bert-pretraining-deep-bidirectional-transformers');
    expect(slugs).toContain('flashattention-fast-memory-efficient-exact-attention-io-awareness');
    expect(slugs).toContain('deepseek-v3-technical-report');
    expect(slugs).toContain('mooncake-kvcache-centric-disaggregated-architecture');
    expect(slugs).toContain('qwen25-technical-report');
  });
});
