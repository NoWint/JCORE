import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LatexAdapter } from '../../scripts/import/adapters/latex';
import type { LatexConverter } from '../../scripts/import/converters/pandoc';
import type { ImportManifest } from '../../scripts/import/manifest';
import type { ImportSource } from '../../scripts/import/types';
import { validManifest } from '../fixtures/import/core/valid-manifest';

function sourceFromFixture(name: string): ImportSource {
  const directory = join(process.cwd(), 'tests/fixtures/import/latex', name);
  const files: ImportSource['files'] = [];
  const visit = (current: string, relative = '') => {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const path = relative ? `${relative}/${entry}` : entry;
      if (statSync(fullPath).isDirectory()) {
        visit(fullPath, path);
      } else {
        files.push({ path, data: new Uint8Array(readFileSync(fullPath)) });
      }
    }
  };
  visit(directory);
  return {
    packagePath: directory,
    checksum: 'a'.repeat(64),
    files
  };
}

function fakeConverter(): LatexConverter {
  return {
    async convert() {
      return {
        body: [
          '# Introduction',
          '',
          'Intro text with a footnote.[^1]',
          '',
          '## Methods',
          '',
          '$$E = mc^2$$',
          '',
          '![Figure](figure.svg)',
          '',
          '| A | B |',
          '| --- | --- |',
          '| 1 | 2 |',
          '',
          '```',
          'code block',
          '```',
          '',
          '## References',
          '',
          '1. Doe, J. (2026). Fixture Article.',
          '',
          '[^1]: Footnote text.'
        ].join('\n'),
        diagnostics: []
      };
    }
  };
}

function codes(diagnostics: Array<{ code: string }>): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

describe('LaTeX adapter', () => {
  it('accepts a valid package and normalizes all article elements', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const source = sourceFromFixture('valid');
    expect(codes(await adapter.inspect(validManifest, source))).toEqual([]);

    const parsed = await adapter.parse(validManifest, source);
    expect(parsed.rootDocument).toBe('main.tex');

    const normalized = await adapter.normalize(validManifest, parsed, { hash: () => 'hash' });
    expect(normalized.body).toContain('# Introduction');
    expect(normalized.body).toContain('$$E = mc^2$$');
    expect(normalized.body).toContain('![Figure]');
    expect(normalized.body).toContain('| A | B |');
    expect(normalized.body).toContain('[^1]');
    expect(normalized.body).toContain('```');
    expect(normalized.body).toContain('1. Doe, J.');
  });

  it('rejects ambiguous roots', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const manifest = { ...validManifest, rootDocument: undefined } as ImportManifest;
    const diagnostics = await adapter.inspect(manifest, sourceFromFixture('ambiguous-root'));
    expect(codes(diagnostics)).toContain('multiple-latex-roots');
  });

  it('rejects shell escape commands', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('unsafe-shell'));
    expect(codes(diagnostics)).toContain('unsafe-tex-command');
  });

  it('rejects absolute and traversal input paths', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('absolute-or-traversal'));
    expect(codes(diagnostics)).toContain('unsafe-path');
  });

  it('rejects missing bibliography files', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('missing-bib'));
    expect(codes(diagnostics)).toContain('missing-bibliography');
  });

  it('rejects missing figure assets', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('missing-asset'));
    expect(codes(diagnostics)).toContain('missing-asset');
  });

  it('rejects unresolved citations', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('unresolved-ref'));
    expect(codes(diagnostics)).toContain('unresolved-citation');
  });

  it('accepts compiled bibliography output when the source package has a bbl file', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('bbl-only'));
    expect(diagnostics).toEqual([]);
  });

  it('accepts an available conditional figure asset', async () => {
    const adapter = new LatexAdapter(fakeConverter());
    const diagnostics = await adapter.inspect(validManifest, sourceFromFixture('conditional-asset'));
    expect(diagnostics).toEqual([]);
  });
});
