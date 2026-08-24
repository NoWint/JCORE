import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load } from 'cheerio';
import { makeDiagnostic, formatDiagnostic, type Diagnostic } from './diagnostics';

const EXPECTED_ROUTES = [
  'index.html',
  'en/about/index.html',
  'zh/about/index.html',
  'en/articles/index.html',
  'en/articles/JCORE-2026-0001/index.html',
  'en/articles/external/attention-is-all-you-need/index.html',
  'en/issues/volume-1-issue-1/index.html',
  'en/authors/demo-author-001/index.html',
  'en/search/index.html',
  'citations/JCORE-2026-0001.bib',
  'pagefind/pagefind.js',
  'pagefind/pagefind-entry.json'
];

function htmlFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        visit(full);
      } else if (entry.endsWith('.html')) {
        files.push(full);
      }
    }
  };
  visit(root);
  return files;
}

function resolveTarget(distRoot: string, base: string, reference: string): string | undefined {
  const cleaned = reference.split('#')[0].split('?')[0];
  if (
    !cleaned ||
    cleaned.startsWith('http') ||
    cleaned.startsWith('mailto') ||
    cleaned.startsWith('tel') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:') ||
    cleaned.startsWith('javascript:')
  ) {
    return undefined;
  }
  let relative: string;
  if (base && cleaned.startsWith(base)) {
    relative = cleaned.slice(base.length);
  } else if (cleaned.startsWith('/')) {
    relative = cleaned.slice(1);
  } else {
    return undefined;
  }
  const normalized = relative.replace(/^\/+/, '');
  const candidate = normalized.endsWith('/')
    ? join(normalized, 'index.html')
    : normalized.endsWith('.html') || normalized.includes('.')
      ? normalized
      : join(normalized, 'index.html');
  return join(distRoot, candidate);
}

export function validateBuiltSite(distRoot: string, base: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const route of EXPECTED_ROUTES) {
    if (!existsSync(join(distRoot, route))) {
      diagnostics.push(
        makeDiagnostic(
          'missing-route',
          'error',
          'built-site',
          route,
          `Expected static route ${route} was not built`,
          'Run the full build and search index before publishing',
          route
        )
      );
    }
  }

  if (!existsSync(distRoot)) {
    diagnostics.push(
      makeDiagnostic(
        'missing-dist',
        'error',
        'built-site',
        distRoot,
        'Static output directory does not exist',
        'Run the build before validating the built site',
        'dist'
      )
    );
    return diagnostics;
  }

  for (const file of htmlFiles(distRoot)) {
    const html = readFileSync(file, 'utf8');
    const $ = load(html);
    const ids = new Set<string>();
    $('[id]').each((_, element) => {
      const id = $(element).attr('id');
      if (id) {
        if (ids.has(id)) {
          diagnostics.push(
            makeDiagnostic(
              'duplicate-rendered-id',
              'error',
              'built-site',
              file,
              `Rendered HTML contains duplicate id ${id}`,
              'Fix duplicate source labels or generated heading ids',
              id
            )
          );
        }
        ids.add(id);
      }
    });
    if ($('.katex-error').length > 0 || /class=["'][^"']*katex-error/.test(html)) {
      diagnostics.push(
        makeDiagnostic(
          'katex-error',
          'error',
          'built-site',
          file,
          'Built HTML contains visible KaTeX error markup',
          'Fix or escape unsupported math before publishing',
          'math'
        )
      );
    }
    if (/:::\s|reference-type=|data-reference-type=|data-reference=/.test(html)) {
      diagnostics.push(
        makeDiagnostic(
          'source-artifact',
          'error',
          'built-site',
          file,
          'Built HTML contains source conversion artifacts',
          'Normalize source artifacts before publishing',
          'html'
        )
      );
    }
    const references: string[] = [];
    $('[href]').each((_, element) => {
      const value = $(element).attr('href');
      if (value) {
        references.push(value);
      }
    });
    $('[src]').each((_, element) => {
      const value = $(element).attr('src');
      if (value) {
        references.push(value);
      }
    });
    for (const reference of references) {
      if (reference.startsWith('#')) {
        const target = reference.slice(1);
        if (target && !ids.has(target)) {
          diagnostics.push(
            makeDiagnostic(
              'broken-internal-anchor',
              'error',
              'built-site',
              file,
              `Internal reference ${reference} points to missing id`,
              'Fix the reference or provide the target element',
              target
            )
          );
        }
        continue;
      }
      const target = resolveTarget(distRoot, base, reference);
      if (target && !existsSync(target)) {
        diagnostics.push(
          makeDiagnostic(
            'broken-link',
            'error',
            'built-site',
            file,
            `Internal reference ${reference} resolves to missing ${target}`,
            'Fix the link or include the target asset in the build',
            reference
          )
        );
      }
    }
  }

  return diagnostics;
}

function main(): void {
  const root = resolve(process.cwd(), 'dist');
  const base = process.env.PUBLIC_SITE_URL
    ? new URL(process.env.PUBLIC_SITE_URL).pathname.replace(/\/$/, '')
    : '/JCORE';
  const diagnostics = validateBuiltSite(root, base);
  for (const diagnostic of diagnostics) {
    console.error(formatDiagnostic(diagnostic));
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('built-site.ts')) {
  main();
}
