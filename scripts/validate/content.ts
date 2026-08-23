import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

  for (const file of filesUnder(directory).filter((file) => file.endsWith('.md'))) {
    const parsed = matter(readFileSync(file, 'utf8'));
    const result = schema.safeParse(parsed.data);
    if (result.success) {
      records.push({ ...result.data, body: parsed.content.trim() } as T);
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

function main(): void {
  const root = process.cwd();
  const { index, diagnostics } = loadContent(root);
  diagnostics.push(...validatePublication(index));

  for (const diagnostic of diagnostics) {
    console.error(formatDiagnostic(diagnostic));
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    process.exitCode = 1;
  }
}

main();
