import { readFile, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { detectSourceType, runCli } from '../../scripts/import/cli';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('source fallback bundle', () => {
  it('emits a valid fallback record with a readable diagnostic report', async () => {
    const root = await mkdtemp(join(tmpdir(), 'jcore-fallback-test-'));
    temporaryRoots.push(root);
    const input = join(root, 'paper.pdf');
    const manifestPath = join(root, 'manifest.yaml');
    const stagingRoot = join(root, 'staging');
    await writeFile(input, '%PDF-1.4\nnot enough structure for text extraction\n');
    await writeFile(
      manifestPath,
      [
        'sourceType: pdf',
        'articleKind: external',
        'targetSlug: paper',
        'officialIdentifier: fixture-pdf',
        'officialUrl: https://example.com/fixture-pdf',
        'retrievalDate: 2026-08-24',
        'rights:',
        '  licenseId: fixture-license',
        '  licenseUrl: https://example.com/license',
        '  copyrightHolder: Fixture Authors',
        '  statement: Redistribution permitted for testing.',
        '  evidenceUrl: https://example.com/fixture-pdf',
        '  permitsRedistribution: true',
        'importerVersion: jcore-import@test'
      ].join('\n')
    );

    expect(await detectSourceType(input)).toBe('pdf');
    expect(await runCli(['import', input, '--manifest', manifestPath, '--staging', stagingRoot])).toBe(0);

    const report = JSON.parse(await readFile(join(stagingRoot, 'paper', 'import-report.json'), 'utf8')) as {
      status: string;
      normalized: {
        renderMode: string;
        sourceFiles: Array<{ path: string }>;
        conversion: { status: string };
      };
    };
    expect(report.status).toBe('success');
    expect(report.normalized.renderMode).toBe('source-fallback');
    expect(report.normalized.conversion.status).toBe('fallback');
    expect(report.normalized.sourceFiles).toEqual([
      { path: '/sources/paper/paper.pdf', label: 'Original PDF', kind: 'pdf' }
    ]);
    expect((await stat(join(stagingRoot, 'paper', 'source', 'paper.pdf'))).isFile()).toBe(true);
  });
});
