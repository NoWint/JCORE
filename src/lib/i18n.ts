import type { LocalizedText } from './content/contracts';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function localize(value: LocalizedText, locale: Locale, fallback: Locale = 'en'): string {
  return value[locale] ?? value[fallback] ?? value.en;
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}
