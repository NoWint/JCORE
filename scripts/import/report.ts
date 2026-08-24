import { stringify } from 'yaml';
import { checksumData } from './checksum';
import type { Diagnostic } from '../validate/diagnostics';
import type { ImportManifest, ImportReport, NormalizedImport } from './types';

export function successReport(
  manifest: ImportManifest,
  normalized: NormalizedImport,
  outputChecksum: string
): ImportReport {
  return {
    status: 'success',
    manifest,
    normalized,
    outputChecksum,
    importerVersion: manifest.importerVersion,
    generatedAt: new Date().toISOString()
  };
}

export function failureReport(
  manifest: ImportManifest | null,
  diagnostics: Diagnostic[],
  importerVersion = 'unknown'
): ImportReport {
  return {
    status: 'failure',
    manifest,
    diagnostics,
    importerVersion,
    generatedAt: new Date().toISOString()
  };
}

export function serializeImportReport(report: ImportReport): string {
  if (report.status === 'success') {
    return JSON.stringify(
      {
        ...report,
        normalized: {
          ...report.normalized,
          assets: report.normalized.assets.map((asset) => ({
            path: asset.path,
            checksum: checksumData(asset.data)
          }))
        }
      },
      null,
      2
    );
  }
  return JSON.stringify(report, null, 2);
}

export function serializeFrontmatter(metadata: Record<string, unknown>): string {
  return `---\n${stringify(metadata, { sortMapEntries: true })}---\n`;
}
