import { createHash } from 'node:crypto';

export function checksumData(data: string | Uint8Array): string {
  const hash = createHash('sha256');
  if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    hash.update(data);
  }
  return hash.digest('hex');
}
