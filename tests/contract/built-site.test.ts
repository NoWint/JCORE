import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateBuiltSite } from '../../scripts/validate/built-site';

const distRoot = join(process.cwd(), 'dist');

describe.skipIf(!existsSync(join(distRoot, 'index.html')))('built site', () => {
  it('has no broken internal links and all expected routes', () => {
    const diagnostics = validateBuiltSite(distRoot, '/JCORE');
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  }, 30_000);
});
