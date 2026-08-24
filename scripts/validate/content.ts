import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';
import type { ZodType } from 'zod';
import {
  articleMetadataSchema,
  authorSchema,
  externalArticleMetadataSchema,
  issueMetadataSchema,
  selectionSchema
} from '../../src/lib/content/contracts';
import type { CollectionIndex } from '../../src/lib/content/types';
import { validateArticleCorpus } from '../../src/lib/article/quality';
import { makeDiagnostic, formatDiagnostic, type Diagnostic } from './diagnostics';
import { validatePublication } from './publication';

function filesUnder(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  return readdirSync(directory, { recursive: true })
    .map((entry) => String(entry))
    .map((entry) => join(directory, entry))
    .filter((entry) => statSync(entry).isFile());
}

function loadMarkdown<T>(directory: string, schema: ZodType<T>): {
  records: T[];
  diagnostics: Diagnostic[];
} {
  const records: T[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const file of filesUnder(directory).filter((file) => file.endsWith('/index.md'))) {
    const parsed = matter(readFileSync(file, 'utf8'));
    const result = schema.safeParse(parsed.data);
    if (result.success) {
      const bodyPath = join(file, '..', 'body.md');
      const body = statSync(bodyPath, { throwIfNoEntry: false })?.isFile()
        ? readFileSync(bodyPath, 'utf8').trim()
        : '';
      const renderMode = (result.data as { renderMode?: string }).renderMode ?? 'structured';
      const conversion = (result.data as { conversion?: { reportPath?: string } }).conversion;
      const reportPath = conversion?.reportPath ? resolve(join(file, '..'), conversion.reportPath) : '';
      let conversionDiagnostics = undefined;
      if (reportPath && statSync(reportPath, { throwIfNoEntry: false })?.isFile()) {
        try {
          const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
            normalized?: { diagnostics?: Diagnostic[] };
            diagnostics?: Diagnostic[];
          };
          conversionDiagnostics = report.normalized?.diagnostics ?? report.diagnostics ?? [];
        } catch {
          diagnostics.push(
            makeDiagnostic(
              'conversion-report-invalid',
              'error',
              'content',
              reportPath,
              'Import report is not valid JSON',
              'Regenerate import-report.json from the import CLI',
              'report'
            )
          );
        }
      } else if (renderMode === 'source-fallback') {
        diagnostics.push(
          makeDiagnostic(
            'missing-conversion-report',
            'error',
            'content',
            file,
            'Source-fallback article has no persisted import report',
            'Keep import-report.json beside index.md and preserve its diagnostics',
            'conversion.reportPath'
          )
        );
      }
      if (!body && renderMode !== 'source-fallback') {
        diagnostics.push(
          makeDiagnostic(
            'missing-body',
            'error',
            'content',
            file,
            'Article metadata has no non-empty body.md sibling',
            'Create or populate the body.md file next to index.md',
            'body'
          )
        );
      }
      records.push({ ...result.data, body, conversionDiagnostics } as T);
    } else {
      diagnostics.push(
        makeDiagnostic(
          'schema-invalid',
          'error',
          'content',
          file,
          String(result.error),
          'Fix the frontmatter to satisfy the content contract',
          'frontmatter'
        )
      );
    }
  }

  return { records, diagnostics };
}

function loadYaml<T>(directory: string, schema: ZodType<T>): {
  records: T[];
  diagnostics: Diagnostic[];
} {
  const records: T[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const file of filesUnder(directory).filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))) {
    const result = schema.safeParse(parseYaml(readFileSync(file, 'utf8')));
    if (result.success) {
      records.push(result.data);
    } else {
      diagnostics.push(
        makeDiagnostic(
          'schema-invalid',
          'error',
          'content',
          file,
          String(result.error),
          'Fix the YAML to satisfy the content contract',
          'document'
        )
      );
    }
  }

  return { records, diagnostics };
}

export function loadContent(root: string): { index: CollectionIndex; diagnostics: Diagnostic[] } {
  const contentRoot = join(root, 'content');
  const articles = loadMarkdown(join(contentRoot, 'articles'), articleMetadataSchema);
  const externalArticles = loadMarkdown(join(contentRoot, 'external-articles'), externalArticleMetadataSchema);
  const authors = loadYaml(join(contentRoot, 'authors'), authorSchema);
  const issues = loadYaml(join(contentRoot, 'issues'), issueMetadataSchema);
  const selections = loadYaml(join(contentRoot, 'selections'), selectionSchema);

  const index: CollectionIndex = {
    articles: articles.records as CollectionIndex['articles'],
    externalArticles: externalArticles.records as CollectionIndex['externalArticles'],
    authors: authors.records,
    issues: issues.records,
    selections: selections.records
  };

  return {
    index,
    diagnostics: [
      ...articles.diagnostics,
      ...externalArticles.diagnostics,
      ...authors.diagnostics,
      ...issues.diagnostics,
      ...selections.diagnostics
    ]
  };
}

async function main(): Promise<void> {
  const root = process.cwd();
  const { index, diagnostics } = loadContent(root);
  diagnostics.push(...validatePublication(index));
  diagnostics.push(...(await validateArticleCorpus(index, '/JCORE')));

  for (const diagnostic of diagnostics) {
    console.error(formatDiagnostic(diagnostic));
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? realpathSync(process.argv[1]) : '';
const selfPath = realpathSync(fileURLToPath(import.meta.url));
if (entryPath === selfPath) {
  void main();
}
