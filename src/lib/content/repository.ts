import { loadContent } from '../../../scripts/validate/content';
import type { CollectionIndex } from './types';

export function getRepository(): CollectionIndex {
  const { index, diagnostics } = loadContent(process.cwd());
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) {
    throw new Error(`Content repository failed validation:\n${errors.map((error) => error.message).join('\n')}`);
  }
  return index;
}
