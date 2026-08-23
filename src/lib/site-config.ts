export const LOCALES = ['en', 'zh'] as const;

export type Locale = (typeof LOCALES)[number];

const DEFAULT_SITE = 'https://nowint.github.io/JCORE';

function normalizeBase(url: URL): string {
  const path = url.pathname.replace(/\/+$/, '');
  return path === '' ? '' : path;
}

export function getSiteConfig(
  env: Record<string, string | undefined> = {}
): {
  site: URL;
  base: string;
  locales: typeof LOCALES;
  defaultLocale: Locale;
} {
  const customSite = env.PUBLIC_SITE_URL ?? env.SITE_URL;
  const site = new URL(customSite ?? DEFAULT_SITE);
  const base = customSite ? normalizeBase(site) : '/JCORE';

  return {
    site,
    base,
    locales: LOCALES,
    defaultLocale: 'en'
  };
}
