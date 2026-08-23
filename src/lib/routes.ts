import type { Locale } from './i18n';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

export function makeRoute(locale: Locale, path = '', base = ''): string {
  const basePath = trimSlashes(base);
  const routePath = trimSlashes(path).replace(new RegExp(`^${locale}/`, 'i'), '');
  const prefix = basePath ? `/${basePath}` : '';
  return routePath ? `${prefix}/${locale}/${routePath}/` : `${prefix}/${locale}/`;
}

export function canonicalForRecord(
  record: { kind: 'jcore' | 'external'; id?: string; slug?: string },
  site: URL,
  locale: Locale
): URL {
  const path =
    record.kind === 'external'
      ? `articles/external/${record.slug ?? ''}`
      : `articles/${record.id ?? ''}`;
  return new URL(makeRoute(locale, path, site.pathname.replace(/\/$/, '')), site.origin);
}

export function alternateLinks(
  record: { kind: 'jcore' | 'external'; id?: string; slug?: string },
  site: URL
): Array<{ lang: Locale; href: URL }> {
  return (['en', 'zh'] as const).map((locale) => ({
    lang: locale,
    href: canonicalForRecord(record, site, locale)
  }));
}
