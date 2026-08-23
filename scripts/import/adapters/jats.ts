import { makeDiagnostic } from '../../validate/diagnostics';
import type { ImportManifest } from '../manifest';
import { parseJatsXml, type ParsedJats } from '../parsers/xml';
import type { ImportSource, NormalizedImport, NormalizationContext, SourceAdapter } from '../types';

function findRoot(source: ImportSource, manifest: ImportManifest): { root?: string; diagnostics: ReturnType<typeof makeDiagnostic>[] } {
  const xmlFiles = source.files.filter((file) => file.path.endsWith('.xml')).map((file) => file.path);
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];

  if (manifest.rootDocument) {
    if (!xmlFiles.includes(manifest.rootDocument)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-jats-root',
          'error',
          'jats',
          source.packagePath,
          `Declared root document ${manifest.rootDocument} is not an XML file in the package`,
          'Point rootDocument at a JATS XML file in the package',
          manifest.rootDocument
        )
      );
      return { diagnostics };
    }
    return { root: manifest.rootDocument, diagnostics };
  }

  if (xmlFiles.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        'missing-jats-root',
        'error',
        'jats',
        source.packagePath,
        'No JATS XML root document found in the package',
        'Add an XML root or declare rootDocument in the manifest',
        'root'
      )
    );
  } else if (xmlFiles.length > 1) {
    diagnostics.push(
      makeDiagnostic(
        'multiple-jats-roots',
        'error',
        'jats',
        source.packagePath,
        `Multiple XML files found: ${xmlFiles.join(', ')}`,
        'Declare rootDocument in the import manifest',
        'root'
      )
    );
  }

  return { root: xmlFiles[0], diagnostics };
}

export class JatsAdapter implements SourceAdapter<ParsedJats> {
  readonly sourceType = 'jats' as const;

  async inspect(manifest: ImportManifest, source: ImportSource) {
    const root = findRoot(source, manifest);
    if (!root.root) {
      return root.diagnostics;
    }
    const file = source.files.find((candidate) => candidate.path === root.root);
    if (!file) {
      return root.diagnostics;
    }
    const parsed = parseJatsXml(new TextDecoder().decode(file.data), `${source.packagePath}/${root.root}`);
    const diagnostics = [...root.diagnostics, ...parsed.diagnostics];

    if (!parsed.hasLicense) {
      diagnostics.push(
        makeDiagnostic(
          'missing-permissions',
          'error',
          'jats',
          `${source.packagePath}/${root.root}`,
          'JATS article has no license or permissions block',
          'Add permissions with a license before importing full text',
          'permissions'
        )
      );
    }

    const filePaths = new Set(source.files.map((candidate) => candidate.path));
    for (const asset of parsed.assets) {
      if (!filePaths.has(asset.href)) {
        diagnostics.push(
          makeDiagnostic(
            'missing-asset',
            'error',
            'jats',
            asset.sourcePath,
            `Graphic asset ${asset.href} is missing from the package`,
            'Add the graphic file or fix the href',
            asset.href
          )
        );
      }
    }

    return diagnostics;
  }

  async parse(manifest: ImportManifest, source: ImportSource): Promise<ParsedJats> {
    const root = findRoot(source, manifest);
    if (!root.root) {
      throw new Error('JATS package has no resolvable root document');
    }
    const file = source.files.find((candidate) => candidate.path === root.root);
    if (!file) {
      throw new Error(`JATS root document ${root.root} is missing`);
    }
    return parseJatsXml(new TextDecoder().decode(file.data), `${source.packagePath}/${root.root}`);
  }

  async normalize(
    manifest: ImportManifest,
    parsed: ParsedJats,
    _context: NormalizationContext
  ): Promise<NormalizedImport> {
    void _context;
    return {
      metadata: {
        kind: manifest.articleKind === 'jcore' ? 'jcore' : 'external',
        slug: manifest.targetSlug,
        title: { en: parsed.title },
        authors: parsed.authors.map((author) => `${author.givenNames} ${author.surname}`.trim()),
        abstract: parsed.abstract,
        keywords: parsed.keywords,
        doi: parsed.doi
      },
      body: parsed.bodyMarkdown,
      assets: [],
      diagnostics: []
    };
  }
}
