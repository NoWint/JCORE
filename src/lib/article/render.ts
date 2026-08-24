import { load, type CheerioAPI } from 'cheerio';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { makeDiagnostic, type Diagnostic } from '../../../scripts/validate/diagnostics';
import { indexArticleBody } from './index';
import { normalizeArticleBody, normalizeSourceId } from './normalize';
import type {
  ArticleRenderOptions,
  ArticleRenderReport,
  Heading,
  MediaKind,
  MediaReference,
} from './types';

export type {
  ArticleReference,
  ArticleRenderOptions,
  ArticleRenderReport,
  ArticleStructure,
  Heading,
  MediaKind,
  MediaReference,
} from './types';

function prefixLocalPath(value: string, base: string): string {
  if (!value.startsWith('/') || !base || value.startsWith(`${base}/`)) {
    return value;
  }
  return `${base}${value}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isUnsafeUrl(value: string): boolean {
  return /^(?:javascript|vbscript|data:text\/html):/i.test(value.trim());
}

function collectMedia($: CheerioAPI): MediaReference[] {
  const media: MediaReference[] = [];
  $('img[src], embed[src], video[src], source[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (!src) {
      return;
    }
    const tagName = element.tagName.toLowerCase();
    const kind: MediaKind = tagName === 'img' ? 'image' : tagName === 'video' || tagName === 'source' ? 'video' : 'embed';
    if (!media.some((item) => item.src === src && item.kind === kind)) {
      media.push({ src, kind });
    }
  });
  return media;
}

function removeSourceComments(html: string): string {
  return html.replace(/<!--\s*jcore-[\s\S]*?-->/g, '');
}

function rewriteRenderedHtml(
  html: string,
  headings: Heading[],
  ids: Set<string>,
  base: string,
): { html: string; media: MediaReference[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const $ = load(html, null, false);

  $('script, style, iframe, object, form').remove();
  $('[href], [src], [poster]').each((_, element) => {
    for (const attribute of ['href', 'src', 'poster']) {
      const value = $(element).attr(attribute);
      if (!value) {
        continue;
      }
      if (isUnsafeUrl(value)) {
        $(element).removeAttr(attribute);
        diagnostics.push(
          makeDiagnostic(
            'unsafe-url',
            'error',
            'article-render',
            'body.md',
            `Removed unsafe ${attribute} URL`,
            'Use a relative or HTTPS URL for article content',
            value,
          ),
        );
        continue;
      }
      if (value.startsWith('/figures/')) {
        $(element).attr(attribute, prefixLocalPath(value, base));
      }
    }
    for (const attribute of Object.keys(element.attribs ?? {})) {
      if (/^on/i.test(attribute)) {
        $(element).removeAttr(attribute);
      }
    }
  });

  $('h1, h2, h3, h4, h5, h6').each((index, element) => {
    const heading = headings[index];
    if (heading) {
      $(element).attr('id', heading.id);
    }
  });

  $('[data-jcore-target-id]').each((_, marker) => {
    const id = $(marker).attr('data-jcore-target-id');
    if (!id) {
      $(marker).remove();
      return;
    }
    const target = $(marker).nextAll('figure, table, p, pre, blockquote, div').first();
    if (target.length > 0) {
      target.attr('id', id);
    } else {
      $(marker).parent().attr('id', id);
    }
    $(marker).remove();
  });

  $('.katex-error').each((_, element) => {
    const source = $(element).attr('title') || $(element).text() || 'Unsupported equation';
    $(element).replaceWith(`<code class="math-fallback">${escapeHtml(source)}</code>`);
    diagnostics.push(
      makeDiagnostic(
        'unsupported-math',
        'warning',
        'article-render',
        'body.md',
        'An unsupported equation was rendered as escaped source text',
        'Review the equation syntax if a typeset formula is required',
        'math',
      ),
    );
  });

  $('a[href^="#"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) {
      return;
    }
    const target = normalizeSourceId(href.slice(1));
    if (ids.has(target)) {
      $(element).attr('href', `#${target}`);
    } else {
      $(element).removeAttr('href');
      diagnostics.push(
        makeDiagnostic(
          'unresolved-reference',
          'warning',
          'article-render',
          'body.md',
          `Internal reference ${href} has no matching target`,
          'Fix the source label or leave the reference as readable text',
          target,
        ),
      );
    }
  });

  const rendered = removeSourceComments($.root().html() ?? '');
  return {
    html: rendered,
    media: collectMedia(load(rendered, null, false)),
    diagnostics,
  };
}

export async function renderArticle(
  markdown: string,
  options: ArticleRenderOptions = {},
): Promise<ArticleRenderReport> {
  const normalized = normalizeArticleBody(markdown);
  const structure = indexArticleBody(normalized.markdown);
  const prefixed = normalized.markdown
    .replace(/\]\((\/figures\/)/g, `](${options.base ?? ''}$1`)
    .replace(/(src|href)="(\/figures\/)/g, `$1="${options.base ?? ''}$2`);

  let rendered = '';
  const diagnostics = [...normalized.diagnostics, ...structure.diagnostics];
  try {
    const file = await unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(prefixed);
    rendered = String(file);
  } catch (error) {
    diagnostics.push(
      makeDiagnostic(
        'render-failed',
        'error',
        'article-render',
        'body.md',
        error instanceof Error ? error.message : String(error),
        'Inspect the normalized body and supported Markdown/math syntax',
        'render',
      ),
    );
  }

  const postProcessed = rewriteRenderedHtml(rendered, structure.headings, structure.ids, options.base ?? '');
  diagnostics.push(...postProcessed.diagnostics);

  return {
    html: postProcessed.html,
    headings: structure.headings,
    media: postProcessed.media,
    diagnostics,
  };
}

export function extractHeadings(markdown: string): Heading[] {
  const normalized = normalizeArticleBody(markdown);
  return indexArticleBody(normalized.markdown).headings;
}

export async function renderArticleBody(markdown: string, base = ''): Promise<string> {
  const report = await renderArticle(markdown, { base });
  return report.html;
}
