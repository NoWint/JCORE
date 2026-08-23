import { validResolution } from '../resolution-valid/resolution';

export const metadataOnlyResolution = {
  ...validResolution,
  status: 'metadata-only' as const,
  source: { packagePath: '', checksum: '', files: [] },
  checksum: ''
};
