import { describe, expect, it } from 'vitest';
import { getSiteConfig } from '../../src/lib/site-config';

describe('getSiteConfig', () => {
  it('uses project-pages defaults', () => {
    expect(getSiteConfig({}).base).toBe('/JCORE');
    expect(getSiteConfig({}).locales).toEqual(['en', 'zh']);
  });

  it('switches to root deployment for a custom site URL', () => {
    expect(getSiteConfig({ PUBLIC_SITE_URL: 'https://journal.example' }).base).toBe('');
  });
});
