import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';
import type { ImportManifest } from '../manifest';
import type { DoiResolution, ImportSource, NormalizedImport, NormalizationContext, SourceAdapter } from '../types';
import { JatsAdapter } from './jats';
import { LatexAdapter } from './latex';

export function validateDoiResolution(resolution: DoiResolution): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (resolution.status === 'metadata-only') {
    diagnostics.push(
      makeDiagnostic(
        'metadata-only',
        'error',
        'doi',
        resolution.identifier,
        'DOI resolution provides metadata only and cannot emit full text',
        'Obtain an authorized LaTeX or JATS source before importing full text',
        'status'
      )
    );
  }

  if (!resolution.rights.permitsRedistribution) {
    diagnostics.push(
      makeDiagnostic(
        'license-denied',
        'error',
        'doi',
        resolution.identifier,
        'DOI resolution does not permit full-text redistribution',
        'Do not vendor full text without redistribution rights',
        'rights.permitsRedistribution'
      )
    );
  }

  if (resolution.source.checksum !== resolution.checksum) {
    diagnostics.push(
      makeDiagnostic(
        'checksum-mismatch',
        'error',
        'doi',
        resolution.source.packagePath,
        `Resolution checksum ${resolution.checksum} does not match source ${resolution.source.checksum}`,
        'Re-download or re-record the DOI resolution',
        'checksum'
      )
    );
  }

  if (resolution.source.files.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        'missing-source-files',
        'error',
        'doi',
        resolution.identifier,
        'DOI resolution has no source files',
        'Record a source package before importing full text',
        'source.files'
      )
    );
  }

  return diagnostics;
}

export class DoiAdapter implements SourceAdapter<unknown> {
  readonly sourceType = 'doi' as const;

  constructor(
    private readonly resolutions: Map<string, DoiResolution>,
    private readonly latex: LatexAdapter,
    private readonly jats: JatsAdapter
  ) {}

  private resolve(manifest: ImportManifest): { resolution?: DoiResolution; diagnostics: Diagnostic[] } {
    const resolution = this.resolutions.get(manifest.officialIdentifier);
    if (!resolution) {
      return {
        diagnostics: [
          makeDiagnostic(
            'missing-doi-resolution',
            'error',
            'doi',
            manifest.officialIdentifier,
            'No recorded DOI resolution exists for this identifier',
            'Run the network discovery command and commit the recorded resolution',
            'resolution'
          )
        ]
      };
    }
    return { resolution, diagnostics: validateDoiResolution(resolution) };
  }

  private delegate(resolution: DoiResolution): SourceAdapter<unknown> {
    return (resolution.sourceFormat === 'latex' ? this.latex : this.jats) as unknown as SourceAdapter<unknown>;
  }

  private effectiveManifest(manifest: ImportManifest, resolution: DoiResolution): ImportManifest {
    return {
      ...manifest,
      sourceType: resolution.sourceFormat,
      rootDocument: resolution.rootDocument,
      expectedChecksum: resolution.checksum
    };
  }

  async inspect(manifest: ImportManifest, source: ImportSource) {
    void source;
    const { resolution, diagnostics } = this.resolve(manifest);
    if (!resolution) {
      return diagnostics;
    }
    if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      return diagnostics;
    }
    return this.delegate(resolution).inspect(this.effectiveManifest(manifest, resolution), resolution.source);
  }

  async parse(manifest: ImportManifest, source: ImportSource): Promise<unknown> {
    void source;
    const { resolution } = this.resolve(manifest);
    if (!resolution) {
      throw new Error('No recorded DOI resolution exists for this identifier');
    }
    return this.delegate(resolution).parse(this.effectiveManifest(manifest, resolution), resolution.source);
  }

  async normalize(manifest: ImportManifest, parsed: unknown, context: NormalizationContext): Promise<NormalizedImport> {
    const { resolution } = this.resolve(manifest);
    if (!resolution) {
      throw new Error('No recorded DOI resolution exists for this identifier');
    }
    return this.delegate(resolution).normalize(this.effectiveManifest(manifest, resolution), parsed, context);
  }
}
