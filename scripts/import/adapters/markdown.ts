import { posix } from 'node:path';
import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';
import type { ImportManifest } from '../manifest';
import type { ImportSource, NormalizedImport, NormalizationContext, SourceAdapter } from '../types';

function findRoot(manifest: ImportManifest, source: ImportSource): { root?: string; diagnostics: Diagnostic[] } {
  const markdownFiles = source.files
    .map((file) => file.path)
    .filter((path) => /\.(?:md|markdown)$/i.test(path));
  const diagnostics: Diagnostic[] = [];

  if (manifest.rootDocument) {
    if (!source.files.some((file) => file.path === manifest.rootDocument)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-markdown-root',
          'error',
          'markdown',
          source.packagePath,
          `Declared root document ${manifest.rootDocument} is not in the source`,
          'Point rootDocument at a Markdown file in the source',
          manifest.rootDocument
        )
      );
      return { diagnostics };
    }
    return { root: manifest.rootDocument, diagnostics };
  }

  const body = markdownFiles.find((path) => path.toLowerCase().endsWith('/body.md') || path === 'body.md');
  if (body) {
    return { root: body, diagnostics };
  }
  if (markdownFiles.length === 1) {
    return { root: markdownFiles[0], diagnostics };
  }
  if (markdownFiles.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        'missing-markdown-root',
        'error',
        'markdown',
        source.packagePath,
        'No Markdown root document found in the source',
        'Provide a .md file or declare rootDocument in the manifest',
        'root'
      )
    );
  } else {
    diagnostics.push(
      makeDiagnostic(
        'multiple-markdown-roots',
        'error',
        'markdown',
        source.packagePath,
        `Multiple Markdown files found: ${markdownFiles.join(', ')}`,
        'Declare rootDocument in the import manifest',
        'root'
      )
    );
  }
  return { root: markdownFiles[0], diagnostics };
}

interface ParsedMarkdown {
  rootDocument: string;
  text: string;
  files: ImportSource['files'];
}

export class MarkdownAdapter implements SourceAdapter<ParsedMarkdown> {
  readonly sourceType = 'markdown' as const;

  async inspect(manifest: ImportManifest, source: ImportSource): Promise<Diagnostic[]> {
    return findRoot(manifest, source).diagnostics;
  }

  async parse(manifest: ImportManifest, source: ImportSource): Promise<ParsedMarkdown> {
    const result = findRoot(manifest, source);
    if (!result.root) {
      throw new Error('Markdown source has no resolvable root document');
    }
    const file = source.files.find((candidate) => candidate.path === result.root);
    if (!file) {
      throw new Error(`Markdown root document ${result.root} is missing`);
    }
    return {
      rootDocument: result.root,
      text: new TextDecoder().decode(file.data).replace(/^\uFEFF/, '').trim(),
      files: source.files
    };
  }

  async normalize(
    manifest: ImportManifest,
    parsed: ParsedMarkdown,
    _context: NormalizationContext
  ): Promise<NormalizedImport> {
    void _context;
    if (!parsed.text) {
      return {
        metadata: {},
        body: '',
        assets: [],
        diagnostics: [
          makeDiagnostic(
            'empty-markdown',
            'error',
            'markdown',
            parsed.rootDocument,
            'Markdown source is empty',
            'Add article content to the Markdown source',
            parsed.rootDocument
          )
        ]
      };
    }

    const assets: Array<{ path: string; data: Uint8Array }> = [];
    let body = parsed.text;
    const rootDirectory = posix.dirname(parsed.rootDocument);
    for (const match of parsed.text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
      const reference = match[2];
      if (/^(?:[a-z]+:|\/|#)/i.test(reference)) {
        continue;
      }
      const resolvedReference = posix.normalize(posix.join(rootDirectory, reference));
      if (resolvedReference.startsWith('../')) {
        continue;
      }
      const asset = parsed.files.find((file) => file.path === resolvedReference || file.path === reference);
      if (!asset) {
        continue;
      }
      const assetPath = asset.path.replace(/^\/+/, '');
      assets.push({ path: assetPath, data: asset.data });
      body = body.replaceAll(`](${reference})`, `](assets/${assetPath})`);
    }

    return {
      metadata: {
        kind: manifest.articleKind,
        slug: manifest.targetSlug
      },
      body,
      assets,
      diagnostics: []
    };
  }
}
