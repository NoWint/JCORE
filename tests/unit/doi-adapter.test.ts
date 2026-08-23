import { describe, expect, it } from 'vitest';
import { DoiAdapter, validateDoiResolution } from '../../scripts/import/adapters/doi';
import type { LatexConverter } from '../../scripts/import/converters/pandoc';
import { JatsAdapter } from '../../scripts/import/adapters/jats';
import { LatexAdapter } from '../../scripts/import/adapters/latex';
import type { ImportManifest } from '../../scripts/import/manifest';
import type { DoiResolution } from '../../scripts/import/types';
import { validManifest } from '../fixtures/import/core/valid-manifest';
import { checksumMismatchResolution } from '../fixtures/import/doi/checksum-mismatch/resolution';
import { licenseDeniedResolution } from '../fixtures/import/doi/license-denied/resolution';
import { metadataOnlyResolution } from '../fixtures/import/doi/metadata-only/resolution';
import { validResolution } from '../fixtures/import/doi/resolution-valid/resolution';

function codes(diagnostics: Array<{ code: string }>): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

function fakeConverter(): LatexConverter {
  return {
    async convert() {
      return { body: '# Introduction\n\nNormalized DOI article body.', diagnostics: [] };
    }
  };
}

function doiManifest(): ImportManifest {
  return {
    ...validManifest,
    sourceType: 'doi',
    officialIdentifier: '1706.03762'
  };
}

function adapter(resolutions: Array<[string, DoiResolution]>): DoiAdapter {
  return new DoiAdapter(
    new Map(resolutions),
    new LatexAdapter(fakeConverter()),
    new JatsAdapter()
  );
}

describe('DOI adapter', () => {
  it('accepts a valid recorded full-text resolution', () => {
    expect(validateDoiResolution(validResolution)).toEqual([]);
  });

  it('rejects metadata-only resolutions', () => {
    expect(codes(validateDoiResolution(metadataOnlyResolution))).toContain('metadata-only');
  });

  it('rejects resolutions without redistribution rights', () => {
    expect(codes(validateDoiResolution(licenseDeniedResolution))).toContain('license-denied');
  });

  it('rejects checksum mismatches', () => {
    expect(codes(validateDoiResolution(checksumMismatchResolution))).toContain('checksum-mismatch');
  });

  it('delegates valid resolutions to the source adapter', async () => {
    const doi = adapter([['1706.03762', validResolution]]);
    const manifest = doiManifest();
    expect(codes(await doi.inspect(manifest, validResolution.source))).toEqual([]);
    const parsed = await doi.parse(manifest, validResolution.source);
    const normalized = await doi.normalize(manifest, parsed, { hash: () => 'hash' });
    expect(normalized.body).toContain('# Introduction');
  });

  it('fails when no recorded resolution exists', async () => {
    const doi = adapter([]);
    expect(codes(await doi.inspect(doiManifest(), validResolution.source))).toContain('missing-doi-resolution');
  });
});
