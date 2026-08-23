import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JatsAdapter } from '../../scripts/import/adapters/jats';
import type { ImportManifest } from '../../scripts/import/manifest';
import type { ImportSource } from '../../scripts/import/types';
import { validManifest } from '../fixtures/import/core/valid-manifest';

function sourceFromFixture(name: string): ImportSource {
  const directory = join(process.cwd(), 'tests/fixtures/import/jats', name);
  const files = readdirSync(directory).map((file) => ({
    path: file,
    data: new Uint8Array(readFileSync(join(directory, file)))
  }));
  return {
    packagePath: directory,
    checksum: 'a'.repeat(64),
    files
  };
}

function manifestForFixture(fixture: string): ImportManifest {
  return {
    ...validManifest,
    sourceType: 'jats',
    targetSlug: `fixture-${fixture}`,
    rootDocument: 'article.xml'
  };
}

function codes(diagnostics: Array<{ code: string }>): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe('JATS adapter', () => {
  it('accepts a valid JATS package and normalizes the article', async () => {
    const adapter = new JatsAdapter();
    const source = sourceFromFixture('valid');
    const manifest = manifestForFixture('valid');
    expect(codes(await adapter.inspect(manifest, source))).toEqual([]);

    const parsed = await adapter.parse(manifest, source);
    expect(parsed.title).toBe('Fixture JATS Article');
    expect(parsed.hasLicense).toBe(true);

    const normalized = await adapter.normalize(manifest, parsed, { hash: () => 'hash' });
    expect(normalized.body).toContain('# Introduction');
    expect(normalized.body).toContain('$$');
    expect(normalized.body).toContain('![Fixture figure.](figure.svg)');
    expect(normalized.body).toContain('| A | B |');
    expect(normalized.body).toContain('```');
    expect(normalized.body).toContain('[^fn1]');
    expect(normalized.body).toContain('Doe J. Fixture Article.');
  });

  it('rejects JATS without permissions', async () => {
    const adapter = new JatsAdapter();
    const diagnostics = await adapter.inspect(manifestForFixture('missing-permissions'), sourceFromFixture('missing-permissions'));
    expect(codes(diagnostics)).toContain('missing-permissions');
  });

  it('rejects external DTD declarations', async () => {
    const adapter = new JatsAdapter();
    const diagnostics = await adapter.inspect(manifestForFixture('external-entity'), sourceFromFixture('external-entity'));
    expect(codes(diagnostics)).toContain('external-dtd');
  });

  it('rejects xrefs to missing ids', async () => {
    const adapter = new JatsAdapter();
    const diagnostics = await adapter.inspect(manifestForFixture('bad-xref'), sourceFromFixture('bad-xref'));
    expect(codes(diagnostics)).toContain('bad-xref');
  });

  it('rejects duplicate ids', async () => {
    const adapter = new JatsAdapter();
    const diagnostics = await adapter.inspect(manifestForFixture('duplicate-id'), sourceFromFixture('duplicate-id'));
    expect(codes(diagnostics)).toContain('duplicate-id');
  });

  it('rejects missing graphic assets', async () => {
    const adapter = new JatsAdapter();
    const diagnostics = await adapter.inspect(manifestForFixture('missing-asset'), sourceFromFixture('missing-asset'));
    expect(codes(diagnostics)).toContain('missing-asset');
  });
});
