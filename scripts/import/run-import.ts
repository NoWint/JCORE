import { importManifestSchema, type ImportManifest } from './manifest';
import { checksumData } from './checksum';
import { failureReport, successReport } from './report';
import type { ImportDependencies, ImportReport, ImportSource, SourceAdapter } from './types';
import { makeDiagnostic } from '../validate/diagnostics';

function parseManifest(value: unknown): { manifest: ImportManifest; diagnostics: [] } | { manifest: null; diagnostics: import('../validate/diagnostics').Diagnostic[] } {
  const result = importManifestSchema.safeParse(value);
  if (result.success) {
    return { manifest: result.data, diagnostics: [] };
  }
  return {
    manifest: null,
    diagnostics: [
      makeDiagnostic(
        'manifest-invalid',
        'error',
        'import',
        'manifest',
        String(result.error),
        'Fix the import manifest before running the import',
        'manifest'
      )
    ]
  };
}

export async function runImport(manifest: unknown, deps: ImportDependencies): Promise<ImportReport> {
  const parsed = parseManifest(manifest);
  if (!parsed.manifest) {
    return failureReport(null, parsed.diagnostics);
  }

  const validManifest = parsed.manifest;

  try {
    const source: ImportSource = await deps.loadSource(validManifest);
    if (validManifest.expectedChecksum && source.checksum !== validManifest.expectedChecksum) {
      return failureReport(
        validManifest,
        [
          makeDiagnostic(
            'checksum-mismatch',
            'error',
            'import',
            source.packagePath,
            `Expected checksum ${validManifest.expectedChecksum} but received ${source.checksum}`,
            'Re-download the source package or correct the manifest checksum',
            'checksum'
          )
        ],
        validManifest.importerVersion
      );
    }

    const adapter: SourceAdapter<unknown> = deps.getAdapter(validManifest.sourceType);
    const inspection = await adapter.inspect(validManifest, source);
    if (inspection.some((diagnostic) => diagnostic.severity === 'error')) {
      return failureReport(validManifest, inspection, validManifest.importerVersion);
    }

    const parsed = await adapter.parse(validManifest, source);
    const normalized = await adapter.normalize(validManifest, parsed, { hash: checksumData });
    if (normalized.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      return failureReport(validManifest, normalized.diagnostics, validManifest.importerVersion);
    }

    const outputChecksum = checksumData(JSON.stringify(normalized) + normalized.body);
    return successReport(validManifest, normalized, outputChecksum);
  } catch (error) {
    return failureReport(
      validManifest,
      [
        makeDiagnostic(
          'import-failed',
          'error',
          'import',
          validManifest.sourcePackagePath ?? validManifest.officialIdentifier,
          error instanceof Error ? error.message : String(error),
          'Inspect the import source and retry with a corrected manifest',
          'run-import'
        )
      ],
      validManifest.importerVersion
    );
  }
}
