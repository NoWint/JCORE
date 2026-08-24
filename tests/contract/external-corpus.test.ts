import { describe, expect, it } from 'vitest';
import { loadContent } from '../../scripts/validate/content';

describe('external corpus', () => {
  it('contains a rights-tracked computer science and AI corpus', () => {
    const { index, diagnostics } = loadContent(process.cwd());
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(index.externalArticles.length).toBeGreaterThanOrEqual(21);
    expect(index.externalArticles.every((article) => article.notPublishedByJCORE)).toBe(true);
    expect(index.externalArticles.every((article) => article.body.length > 100)).toBe(true);
    expect(index.externalArticles.every((article) => article.rights.permitsRedistribution)).toBe(true);
    expect(index.externalArticles.every((article) => article.provenance.checksum.length === 64)).toBe(true);

    const slugs = index.externalArticles.map((article) => article.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'attention-is-all-you-need',
        'bert-pretraining-deep-bidirectional-transformers',
        'flashattention-fast-memory-efficient-exact-attention-io-awareness',
        'deepseek-v3-technical-report',
        'mooncake-kvcache-centric-disaggregated-architecture',
        'qwen25-technical-report',
        'deepseek-r1-reasoning',
        'mamba-linear-time-sequence-modeling',
        'lora-low-rank-adaptation',
        'tvm-optimizing-compiler',
        'mlir-compiler-infrastructure',
        'ansor-tensor-programs'
      ])
    );
  });
});
