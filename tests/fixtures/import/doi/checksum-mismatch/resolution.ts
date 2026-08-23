import { validResolution } from '../resolution-valid/resolution';

export const checksumMismatchResolution = {
  ...validResolution,
  checksum: 'b'.repeat(64)
};
