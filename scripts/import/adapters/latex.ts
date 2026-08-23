import { makeDiagnostic } from '../../validate/diagnostics';
import { inspectLatexPackage } from '../security/tex';
import type { ImportManifest } from '../manifest';
import type { ImportSource, NormalizedImport, NormalizationContext, SourceAdapter } from '../types';
import { PandocLatexConverter, type LatexConverter } from '../converters/pandoc';

export interface ParsedLatex {
  rootDocument: string;
  text: string;
  files: ImportSource['files'];
}

export class LatexAdapter implements SourceAdapter<ParsedLatex> {
  readonly sourceType = 'latex' as const;

  constructor(private readonly converter: LatexConverter = new PandocLatexConverter()) {}

  async inspect(manifest: ImportManifest, source: ImportSource) {
    return inspectLatexPackage(manifest, source).diagnostics;
  }

  async parse(manifest: ImportManifest, source: ImportSource): Promise<ParsedLatex> {
    const inspection = inspectLatexPackage(manifest, source);
    if (!inspection.rootDocument) {
      throw new Error('LaTeX package has no resolvable root document');
    }

    const file = source.files.find((candidate) => candidate.path === inspection.rootDocument);
    if (!file) {
      throw new Error(`LaTeX root document ${inspection.rootDocument} is missing`);
    }

    return {
      rootDocument: inspection.rootDocument,
      text: new TextDecoder().decode(file.data),
      files: source.files
    };
  }

  async normalize(
    manifest: ImportManifest,
    parsed: ParsedLatex,
    _context: NormalizationContext
  ): Promise<NormalizedImport> {
    void _context;
    const converted = await this.converter.convert({
      rootDocument: parsed.rootDocument,
      files: parsed.files
    });

    if (converted.body === '') {
      return {
        metadata: {},
        body: '',
        assets: [],
        diagnostics: [
          ...converted.diagnostics,
          makeDiagnostic(
            'empty-conversion',
            'error',
            'latex',
            parsed.rootDocument,
            'LaTeX conversion produced no article body',
            'Inspect the source and converter output',
            parsed.rootDocument
          )
        ]
      };
    }

    return {
      metadata: {
        kind: manifest.articleKind === 'jcore' ? 'jcore' : 'external',
        slug: manifest.targetSlug
      },
      body: converted.body,
      assets: [],
      diagnostics: converted.diagnostics
    };
  }
}
