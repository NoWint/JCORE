import type { Diagnostic } from '../validate/diagnostics';
import type { ImportManifest } from './manifest';

export type ImportSourceType = 'pdf' | 'latex' | 'jats' | 'markdown' | 'doi';
export type ImportArticleKind = 'jcore' | 'external';

export interface SourceFileReference {
  path: string;
  label: string;
  kind: 'source' | 'pdf' | 'supplementary';
}

export interface ConversionInfo {
  status: 'converted' | 'fallback';
  importer: string;
  outputChecksum: string;
  reportPath: string;
}

export interface ImportSource {
  packagePath: string;
  checksum: string;
  files: Array<{ path: string; data: Uint8Array }>;
}

export interface DoiResolution {
  identifier: string;
  metadata: {
    title: string;
    authors: string[];
    abstract: string;
    venue?: string;
    published?: string;
  };
  source: ImportSource;
  sourceFormat: 'latex' | 'jats';
  rootDocument?: string;
  checksum: string;
  retrievalDate: string;
  rights: ImportManifest['rights'];
  status: 'full-text' | 'metadata-only';
  diagnostics: Diagnostic[];
}

export interface NormalizedImport {
  metadata: Record<string, unknown>;
  body: string;
  assets: Array<{ path: string; data: Uint8Array }>;
  diagnostics: Diagnostic[];
  renderMode?: 'structured' | 'source-fallback';
  sourceFormat?: 'pdf' | 'latex' | 'jats' | 'markdown' | 'doi';
  sourceFiles?: SourceFileReference[];
  conversion?: ConversionInfo;
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
  sourceFiles?: string[];
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
