import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { renderArticle } from '../../../src/lib/article/render';
import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';
import type { ImportManifest } from '../manifest';
import type { ImportSource, NormalizedImport, NormalizationContext, SourceAdapter } from '../types';

const execFileAsync = promisify(execFile);

interface ParsedPdf {
  rootDocument: string;
  data: Uint8Array;
}

function findPdf(source: ImportSource, manifest: ImportManifest): { root?: string; diagnostics: Diagnostic[] } {
  const pdfFiles = source.files.map((file) => file.path).filter((path) => path.toLowerCase().endsWith('.pdf'));
  const diagnostics: Diagnostic[] = [];
  const root = manifest.rootDocument ?? (pdfFiles.length === 1 ? pdfFiles[0] : undefined);

  if (!root) {
    diagnostics.push(
      makeDiagnostic(
        pdfFiles.length > 1 ? 'multiple-pdf-roots' : 'missing-pdf-root',
        'error',
        'pdf',
        source.packagePath,
        pdfFiles.length > 1
          ? `Multiple PDF files found: ${pdfFiles.join(', ')}`
          : 'No PDF source file found',
        'Provide one PDF file or declare rootDocument in the manifest',
        'root'
      )
    );
    return { diagnostics };
  }

  if (!pdfFiles.includes(root)) {
    diagnostics.push(
      makeDiagnostic(
        'missing-pdf-root',
        'error',
        'pdf',
        source.packagePath,
        `Declared PDF ${root} is not in the source`,
        'Point rootDocument at a PDF file in the source',
        root
      )
    );
    return { diagnostics };
  }
  return { root, diagnostics };
}

async function extractText(data: Uint8Array, fileName: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'jcore-pdf-'));
  const input = join(root, basename(fileName));
  try {
    await writeFile(input, data);
    const result = await execFileAsync('pdftotext', ['-layout', input, '-'], {
      maxBuffer: 8 * 1024 * 1024
    });
    return result.stdout.replaceAll(String.fromCharCode(0), '').trim();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export class PdfAdapter implements SourceAdapter<ParsedPdf> {
  readonly sourceType = 'pdf' as const;

  async inspect(manifest: ImportManifest, source: ImportSource): Promise<Diagnostic[]> {
    return findPdf(source, manifest).diagnostics;
  }

  async parse(manifest: ImportManifest, source: ImportSource): Promise<ParsedPdf> {
    const result = findPdf(source, manifest);
    if (!result.root) {
      throw new Error('PDF source has no resolvable root document');
    }
    const file = source.files.find((candidate) => candidate.path === result.root);
    if (!file) {
      throw new Error(`PDF root document ${result.root} is missing`);
    }
    return { rootDocument: result.root, data: file.data };
  }

  async normalize(
    manifest: ImportManifest,
    parsed: ParsedPdf,
    _context: NormalizationContext
  ): Promise<NormalizedImport> {
    void _context;
    try {
      const text = await extractText(parsed.data, parsed.rootDocument);
      if (text.length < 80 || text.split(/\r?\n/).filter(Boolean).length < 2) {
        throw new Error('PDF text extraction returned too little usable text');
      }
      const renderReport = await renderArticle(text);
      if (
        !renderReport.html.trim() ||
        renderReport.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ) {
        throw new Error('Extracted PDF text failed the article renderer preflight');
      }
      return {
        metadata: { kind: manifest.articleKind, slug: manifest.targetSlug },
        body: text,
        assets: [],
        diagnostics: renderReport.diagnostics
      };
    } catch (error) {
      return {
        metadata: { kind: manifest.articleKind, slug: manifest.targetSlug },
        body: '',
        assets: [],
        diagnostics: [
          makeDiagnostic(
            'pdf-conversion-failed',
            'error',
            'pdf',
            parsed.rootDocument,
            error instanceof Error ? error.message : String(error),
            'Use the preserved original PDF or install a working pdftotext converter',
            parsed.rootDocument
          )
        ],
        renderMode: 'source-fallback'
      };
    }
  }
}
