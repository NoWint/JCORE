import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagefindRoot = join(process.cwd(), 'dist', 'pagefind');

describe.skipIf(!existsSync(pagefindRoot))('Pagefind index', () => {
  it('is generated inside the static build', () => {
    expect(existsSync(join(pagefindRoot, 'pagefind.js'))).toBe(true);
    expect(existsSync(join(pagefindRoot, 'pagefind-entry.json'))).toBe(true);
  });
});
