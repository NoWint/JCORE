import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { emitImport } from '../../scripts/import/emit';
import { checksumData } from '../../scripts/import/checksum';
import { failureReport } from '../../scripts/import/report';
import { ImportRegistry } from '../../scripts/import/registry';
import { runImport } from '../../scripts/import/run-import';
import type { ImportDependencies, ImportSource, NormalizedImport, SourceAdapter } from '../../scripts/import/types';
import { createStagingArea } from '../../scripts/import/writer';
import { makeDiagnostic } from '../../scripts/validate/diagnostics';
import { validManifest } from '../fixtures/import/core/valid-manifest';

const temporaryRoots: string[] = [];

async function temporaryDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'jcore-test-'));
  temporaryRoots.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function fakeSource(): ImportSource {
  return {
    packagePath: 'sources/latex/1706.03762',
    checksum: 'a'.repeat(64),
    files: [{ path: 'main.tex', data: new TextEncoder().encode('fixture source') }]
  };
}

function fakeAdapter(): SourceAdapter<{ value: string }> {
  return {
    sourceType: 'latex',
    async inspect() {
      return [];
    },
    async parse() {
      return { value: 'normalized body' };
    },
    async normalize(manifest, parsed): Promise<NormalizedImport> {
      return {
        metadata: {
          kind: 'external',
          slug: manifest.targetSlug,
          title: { en: 'Fixture Article' }
        },
        body: parsed.value,
        assets: [],
        diagnostics: []
      };
    }
  };
}

function deps(): ImportDependencies {
  return {
    async loadSource() {
      return fakeSource();
    },
    getAdapter() {
      return fakeAdapter();
    }
  };
}

describe('deterministic import core', () => {
  it('produces identical normalized output for identical sources', async () => {
    const first = await runImport(validManifest, deps());
    const second = await runImport(validManifest, deps());
    expect(first.status).toBe('success');
    expect(second.status).toBe('success');
    if (first.status !== 'success' || second.status !== 'success') {
      throw new Error('Expected successful imports');
    }
    expect(JSON.stringify(first.normalized)).toBe(JSON.stringify(second.normalized));
    expect(first.outputChecksum).toBe(second.outputChecksum);
  });

  it('fails when the source checksum does not match the manifest', async () => {
    const mismatched = {
      ...validManifest,
      expectedChecksum: 'b'.repeat(64)
    };
    const report = await runImport(mismatched, deps());
    expect(report.status).toBe('failure');
    if (report.status !== 'failure') {
      throw new Error('Expected failure');
    }
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain('checksum-mismatch');
  });

  it('emits atomic artifacts only for successful reports', async () => {
    const report = await runImport(validManifest, deps());
    expect(report.status).toBe('success');
    if (report.status !== 'success') {
      throw new Error('Expected success');
    }

    const targetRoot = await temporaryDir();
    const staging = await createStagingArea();
    const artifacts = await emitImport(report, staging, targetRoot);
    const indexPath = join(artifacts.targetDir, 'index.md');
    const bodyPath = join(artifacts.targetDir, 'body.md');
    expect((await stat(indexPath)).isFile()).toBe(true);
    expect((await stat(bodyPath)).isFile()).toBe(true);
    expect((await readFile(bodyPath, 'utf8')).trim()).toBe('normalized body');

    const failedStaging = await createStagingArea();
    await expect(
      emitImport(
        failureReport(validManifest, [
          makeDiagnostic('import-failed', 'error', 'import', 'fixture', 'failed', 'fix', 'test')
        ]),
        failedStaging,
        targetRoot
      )
    ).rejects.toThrow(/failed import/);
    await failedStaging.cleanup();
  });

  it('reports a deterministic registry JSON', () => {
    const registry = new ImportRegistry([
      {
        targetSlug: 'z-article',
        sourceChecksum: 'a'.repeat(64),
        outputChecksum: checksumData('output'),
        importerVersion: '0.1.0',
        createdAt: '2026-08-23T00:00:00.000Z'
      },
      {
        targetSlug: 'a-article',
        sourceChecksum: 'b'.repeat(64),
        outputChecksum: checksumData('other'),
        importerVersion: '0.1.0',
        createdAt: '2026-08-23T00:00:00.000Z'
      }
    ]);
    const first = registry.toJSON();
    registry.register({
      targetSlug: 'a-article',
      sourceChecksum: 'b'.repeat(64),
      outputChecksum: checksumData('other'),
      importerVersion: '0.1.0',
      createdAt: '2026-08-23T00:00:00.000Z'
    });
    expect(registry.toJSON()).toBe(first);
  });
});
