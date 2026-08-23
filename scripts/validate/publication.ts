import type { CollectionIndex } from '../../src/lib/content/types';
import { makeDiagnostic, type Diagnostic } from './diagnostics';

const DEMO_DATE_LIMIT = '2026-08-23';

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function uniqueValues<T>(
  records: T[],
  idOf: (record: T) => string,
  key: string,
  code: string,
  phase: string
): Diagnostic[] {
  const seen = new Map<string, string>();
  const diagnostics: Diagnostic[] = [];

  for (const record of records) {
    const id = idOf(record);
    const previous = seen.get(id);
    if (previous) {
      diagnostics.push(
        makeDiagnostic(
          code,
          'error',
          phase,
          previous,
          `Duplicate ${key} ${id}`,
          `Rename one record so every ${key} is unique`,
          id
        )
      );
    } else {
      seen.set(id, `content/${phase}/${id}`);
    }
  }

  return diagnostics;
}

export function validatePublication(index: CollectionIndex): Diagnostic[] {
  const diagnostics: Diagnostic[] = [
    ...uniqueValues(index.articles, (article) => article.id, 'article ID', 'article', 'articles'),
    ...uniqueValues(index.externalArticles, (article) => article.slug, 'external slug', 'external', 'external-articles'),
    ...uniqueValues(index.authors, (author) => author.id, 'author ID', 'author', 'authors'),
    ...uniqueValues(index.issues, (issue) => issue.id, 'issue ID', 'issue', 'issues'),
    ...uniqueValues(index.selections, (selection) => selection.id, 'selection ID', 'selection', 'selections')
  ];

  const authorIds = new Set(index.authors.map((author) => author.id));
  const issueIds = new Set(index.issues.map((issue) => issue.id));
  const externalSlugs = new Set(index.externalArticles.map((article) => article.slug));

  for (const article of index.articles) {
    const sourcePath = `content/articles/${article.id}`;
    for (const ref of article.authors) {
      if (!authorIds.has(ref.authorId)) {
        diagnostics.push(
          makeDiagnostic(
            'missing-author',
            'error',
            'article',
            sourcePath,
            `Article references unknown author ${ref.authorId}`,
            `Add the author record or fix the reference`,
            `authors.${ref.order}`
          )
        );
      }
    }

    const issueId = `volume-${article.volume}-issue-${article.issue}`;
    if (!issueIds.has(issueId)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-issue',
          'error',
          'article',
          sourcePath,
          `Article references unknown issue ${issueId}`,
          `Create the issue record or fix volume/issue values`,
          'issue'
        )
      );
    }

    if (article.demo && dateKey(article.dates.published) > DEMO_DATE_LIMIT) {
      diagnostics.push(
        makeDiagnostic(
          'demo-future-date',
          'error',
          'article',
          sourcePath,
          `Demonstration article uses a publication date after ${DEMO_DATE_LIMIT}`,
          'Move the demonstration publication date on or before 2026-08-23',
          'dates.published'
        )
      );
    }

    if (article.demo && article.doi) {
      diagnostics.push(
        makeDiagnostic(
          'demo-doi',
          'error',
          'article',
          sourcePath,
          'Demonstration article declares a DOI',
          'Remove the DOI from the demonstration record',
          'doi'
        )
      );
    }

    if (article.body.trim().length === 0) {
      diagnostics.push(
        makeDiagnostic(
          'empty-body',
          'error',
          'article',
          sourcePath,
          'Article body is empty',
          'Provide normalized article body content',
          'body'
        )
      );
    }
  }

  for (const article of index.externalArticles) {
    const sourcePath = `content/external-articles/${article.slug}`;

    if (article.body.trim().length === 0) {
      diagnostics.push(
        makeDiagnostic(
          'empty-body',
          'error',
          'external',
          sourcePath,
          'External article body is empty',
          'Provide normalized full text or remove the record',
          'body'
        )
      );
    }

    if (article.body.trim().length > 0 && !article.rights.permitsRedistribution) {
      diagnostics.push(
        makeDiagnostic(
          'rights-denied',
          'error',
          'external',
          sourcePath,
          'External full text is present but redistribution is not permitted',
          'Do not vendor full text without redistribution rights',
          'rights.permitsRedistribution'
        )
      );
    }

    if (/^JCORE-\d{4}-\d{4}$/.test(article.slug) || article.slug.startsWith('JCORE-')) {
      diagnostics.push(
        makeDiagnostic(
          'external-jcore-id',
          'error',
          'external',
          sourcePath,
          'External article uses a JCORE-style identifier',
          'Use an external slug under /articles/external/ without a JCORE ID',
          'slug'
        )
      );
    }

    if ('issue' in article) {
      diagnostics.push(
        makeDiagnostic(
          'external-issue',
          'error',
          'external',
          sourcePath,
          'External article declares an issue relation',
          'External articles cannot belong to a JCORE issue',
          'issue'
        )
      );
    }
  }

  for (const selection of index.selections) {
    if (!externalSlugs.has(selection.externalArticleSlug)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-selection-target',
          'error',
          'selection',
          `content/selections/${selection.id}`,
          `Selection references unknown external article ${selection.externalArticleSlug}`,
          'Add the external article or fix the selection reference',
          'externalArticleSlug'
        )
      );
    }
  }

  return diagnostics;
}
