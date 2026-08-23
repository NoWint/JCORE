import { describe, expect, it } from 'vitest';
import { importManifestSchema } from '../../scripts/import/manifest';
import { validManifest } from '../fixtures/import/core/valid-manifest';

describe('import manifest', () => {
  it('accepts a valid manifest', () => {
    expect(importManifestSchema.safeParse(validManifest).success).toBe(true);
  });

  it('rejects an unknown source type', () => {
    expect(importManifestSchema.safeParse({ ...validManifest, sourceType: 'docx' }).success).toBe(false);
  });

  it('rejects an unsafe target slug', () => {
    expect(importManifestSchema.safeParse({ ...validManifest, targetSlug: '../escape' }).success).toBe(false);
  });

  it('rejects a manifest without rights evidence', () => {
    const { rights: _rights, ...withoutRights } = validManifest;
    void _rights;
    expect(importManifestSchema.safeParse(withoutRights).success).toBe(false);
  });

  it('rejects a malformed expected checksum', () => {
    expect(importManifestSchema.safeParse({ ...validManifest, expectedChecksum: 'not-a-hash' }).success).toBe(false);
  });
});
