import { importManifestSchema, type ImportManifest } from './manifest';
import { checksumData } from './checksum';
import { failureReport, successReport } from './report';
import type { ImportDependencies, ImportReport, ImportSource, SourceAdapter } from './types';
import { makeDiagnostic } from '../validate/diagnostics';
import type { NormalizedImport, SourceFileReference } from './types';

const EMPTY_CHECKSUM = '0'.repeat(64);

function sourceFileReferences(manifest: import('./manifest').ImportManifest, source: ImportSource): SourceFileReference[] {
  return source.files.map((file, index) => {
    const isPdf = file.path.toLowerCase().endsWith('.pdf');
    return {
      path: `/sources/${manifest.targetSlug}/${file.path}`,
      label: isPdf ? 'Original PDF' : index === 0 ? 'Original source package' : file.path,
      kind: isPdf ? 'pdf' : 'source'
    };
  });
}

function decorateNormalized(
  manifest: import('./manifest').ImportManifest,
  source: ImportSource,
  normalized: NormalizedImport
): NormalizedImport {
  const renderMode = normalized.renderMode ?? (normalized.body.trim() ? 'structured' : 'source-fallback');
  const sourceFormat = normalized.sourceFormat ?? manifest.sourceType;
  const sourceFiles = normalized.sourceFiles ?? sourceFileReferences(manifest, source);
  const conversion = normalized.conversion ?? {
    status: renderMode === 'structured' ? 'converted' : 'fallback',
    importer: manifest.importerVersion,
    outputChecksum: EMPTY_CHECKSUM,
    reportPath: 'import-report.json'
  };
  const metadata = {
    ...normalized.metadata,
    renderMode,
    sourceFormat,
    sourceFiles,
    conversion,
    ...(sourceFiles.find((file) => file.kind === 'pdf') ? { pdf: sourceFiles.find((file) => file.kind === 'pdf')?.path } : {})
  };

  return {
    ...normalized,
    metadata,
    renderMode,
    sourceFormat,
    sourceFiles,
    conversion
  };
}

function finalizeNormalized(normalized: NormalizedImport, outputChecksum: string): NormalizedImport {
  const conversion = { ...normalized.conversion!, outputChecksum };
  return {
    ...normalized,
    metadata: { ...normalized.metadata, conversion },
    conversion
  };
}

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
    if (!validManifest.rights.permitsRedistribution) {
      return failureReport(
        validManifest,
        [
          makeDiagnostic(
            'license-denied',
            'error',
            'import',
            validManifest.officialIdentifier,
            'Import source cannot be redistributed under the declared rights',
            'Use an official link only or provide evidence that source redistribution is permitted',
            'rights.permitsRedistribution'
          )
        ],
        validManifest.importerVersion
      );
    }
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
    let normalized = decorateNormalized(
      validManifest,
      source,
      await adapter.normalize(validManifest, parsed, { hash: checksumData })
    );
    if (
      normalized.diagnostics.some((diagnostic) => diagnostic.severity === 'error') &&
      normalized.body.trim().length > 0
    ) {
      return failureReport(validManifest, normalized.diagnostics, validManifest.importerVersion);
    }

    const outputChecksum = checksumData(
      JSON.stringify({
        metadata: { ...normalized.metadata, conversion: { ...normalized.conversion, outputChecksum: EMPTY_CHECKSUM } },
        body: normalized.body,
        assets: normalized.assets.map((asset) => ({ path: asset.path, checksum: checksumData(asset.data) })),
        renderMode: normalized.renderMode,
        sourceFormat: normalized.sourceFormat,
        sourceFiles: normalized.sourceFiles
      })
    );
    normalized = finalizeNormalized(normalized, outputChecksum);
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
