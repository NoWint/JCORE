import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectSourceType, runCli } from '../../scripts/import/cli';

const temporaryRoots: string[] = [];

async function temporaryDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'jcore-cli-test-'));
  temporaryRoots.push(root);
  return root;
}

function manifest(slug: string): string {
  return [
    'sourceType: pdf',
    'articleKind: external',
    `targetSlug: ${slug}`,
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
  ].join('\n');
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('unified import CLI', () => {
  it('detects PDF and Markdown inputs', async () => {
    expect(await detectSourceType('/tmp/paper.pdf')).toBe('pdf');
    expect(await detectSourceType('/tmp/body.md')).toBe('markdown');
  });

  it('preserves the original source when PDF conversion is unavailable', async () => {
    const root = await temporaryDir();
    const input = join(root, 'paper.pdf');
    const manifestPath = join(root, 'manifest.yaml');
    const stagingRoot = join(root, 'staging');
    await writeFile(input, '%PDF-1.4\nfixture bytes that are not extractable\n');
    await writeFile(manifestPath, manifest('paper'));

    const code = await runCli([
      'import',
      input,
      '--manifest',
      manifestPath,
      '--staging',
      stagingRoot
    ]);

    expect(code).toBe(0);
    expect(await readFile(join(stagingRoot, 'paper', 'import-report.json'), 'utf8')).toContain(
      '"renderMode": "source-fallback"'
    );
    expect(existsSync(join(stagingRoot, 'paper', 'source', 'paper.pdf'))).toBe(true);
  });
});

describe('import CLI promotion', () => {
  it('refuses promotion over an existing record', async () => {
    const root = await temporaryDir();
    const stagedRecord = join(root, 'staged', 'paper');
    const existingTarget = join(root, 'content', 'paper');
    await mkdir(stagedRecord, { recursive: true });
    await mkdir(existingTarget, { recursive: true });

    const { promoteRecord } = await import('../../scripts/import/cli');
    await expect(promoteRecord(stagedRecord, existingTarget)).rejects.toThrow(/already exists/);
  });
});
