import { describe, expect, it } from 'vitest';
import { formatDate, localize } from '../../src/lib/i18n';

describe('localization helpers', () => {
  it('returns the requested locale and falls back to English', () => {
    expect(localize({ en: 'English', zh: '中文' }, 'zh')).toBe('中文');
    expect(localize({ en: 'English' }, 'zh')).toBe('English');
  });

  it('formats dates for English and Chinese locales', () => {
    const date = new Date('2026-08-20');
    expect(formatDate(date, 'en')).toContain('2026');
    expect(formatDate(date, 'zh')).toContain('2026');
  });
});
