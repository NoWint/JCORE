import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { makeDiagnostic, type Diagnostic } from '../../../scripts/validate/diagnostics';
import type { CollectionIndex } from '../content/types';
import { renderArticle } from './render';
import type { ArticleRenderReport } from './types';

function localAssetPath(src: string, base: string): string | undefined {
  const value = src.split('#')[0].split('?')[0];
  if (!value.startsWith('/')) {
    return undefined;
  }
  const relative = base && value.startsWith(`${base}/`) ? value.slice(base.length) : value;
  return join(process.cwd(), 'public', relative.replace(/^\/+/, ''));
}

function duplicateIds(html: string): string[] {
  const ids = [...load(html, null, false)('[id]')].map((element) => element.attribs.id);
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

export function validateRenderedArticle(report: ArticleRenderReport, sourcePath: string, base = '/JCORE'): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const $ = load(report.html, null, false);
  const ids = new Set<string>();
  $('[id]').each((_, element) => {
    const id = $(element).attr('id');
    if (id) {
      ids.add(id);
    }
  });

  for (const id of duplicateIds(report.html)) {
    diagnostics.push(
      makeDiagnostic(
        'duplicate-rendered-id',
        'error',
        'article-quality',
        sourcePath,
        `Rendered HTML contains duplicate id ${id}`,
        'Make source labels and generated heading ids unique',
        id,
      ),
    );
  }

  if ($('.katex-error').length > 0 || /class=["'][^"']*katex-error/.test(report.html)) {
    diagnostics.push(
      makeDiagnostic(
        'katex-error',
        'error',
        'article-quality',
        sourcePath,
        'Rendered HTML contains visible KaTeX error markup',
        'Wrap display environments correctly or escape unsupported math',
        'math',
      ),
    );
  }

  if (/:::\s|reference-type=|data-jcore-|jcore-(?:heading|target)-id/.test(report.html)) {
    diagnostics.push(
      makeDiagnostic(
        'source-artifact',
        'error',
        'article-quality',
        sourcePath,
        'Rendered HTML contains source conversion artifacts',
        'Remove Pandoc markers and internal normalization markers before shipping',
        'html',
      ),
    );
  }

  $('a[href^="#"]').each((_, element) => {
    const href = $(element).attr('href');
    const target = href?.slice(1);
    if (target && !ids.has(target)) {
      diagnostics.push(
        makeDiagnostic(
          'broken-internal-anchor',
          'error',
          'article-quality',
          sourcePath,
          `Rendered internal link points to missing id ${target}`,
          'Fix the source reference or remove its href',
          target,
        ),
      );
    }
  });

  for (const media of report.media) {
    const target = localAssetPath(media.src, base);
    if (target && !existsSync(target)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-rendered-media',
          'error',
          'article-quality',
          sourcePath,
          `Rendered media source does not exist at ${target}`,
          'Add the asset under public/ or fix the source path',
          media.src,
        ),
      );
    }
  }

  return diagnostics;
}

export async function validateArticleCorpus(index: CollectionIndex, base = '/JCORE'): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const records = [...index.articles, ...index.externalArticles];

  for (const record of records) {
    const identifier = record.kind === 'external' ? record.slug : record.id;
    const report = await renderArticle(record.body, { base });
    diagnostics.push(...validateRenderedArticle(report, `content/${record.kind}/${identifier}`, base));
    diagnostics.push(
      ...report.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').map((diagnostic) => ({
        ...diagnostic,
        phase: 'article-quality',
        sourcePath: `content/${record.kind}/${identifier}`,
      })),
    );
  }

  return diagnostics;
}
