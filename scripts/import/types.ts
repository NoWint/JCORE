import type { Diagnostic } from '../validate/diagnostics';
import type { ImportManifest } from './manifest';

export type ImportSourceType = 'latex' | 'jats' | 'doi';
export type ImportArticleKind = 'jcore' | 'external';

export interface ImportSource {
  packagePath: string;
  checksum: string;
  files: Array<{ path: string; data: Uint8Array }>;
}

export interface NormalizedImport {
  metadata: Record<string, unknown>;
  body: string;
  assets: Array<{ path: string; data: Uint8Array }>;
  diagnostics: Diagnostic[];
}

export interface NormalizationContext {
  hash(data: Uint8Array): string;
}

export interface SourceAdapter<T> {
  sourceType: ImportSourceType;
  inspect(manifest: ImportManifest, source: ImportSource): Promise<Diagnostic[]>;
  parse(manifest: ImportManifest, source: ImportSource): Promise<T>;
  normalize(manifest: ImportManifest, parsed: T, context: NormalizationContext): Promise<NormalizedImport>;
}

export interface ImportDependencies {
  loadSource(manifest: ImportManifest): Promise<ImportSource>;
  getAdapter(sourceType: ImportSourceType): SourceAdapter<unknown>;
}

export interface ImportArtifacts {
  targetDir: string;
  files: Array<{ path: string; content: string }>;
  assets: Array<{ path: string; data: Uint8Array }>;
}

export type ImportReport =
  | {
      status: 'success';
      manifest: ImportManifest;
      normalized: NormalizedImport;
      outputChecksum: string;
      importerVersion: string;
      generatedAt: string;
    }
  | {
      status: 'failure';
      manifest: ImportManifest | null;
      diagnostics: Diagnostic[];
      importerVersion: string;
      generatedAt: string;
    };

export type { ImportManifest };
