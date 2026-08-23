import { validResolution } from '../resolution-valid/resolution';

export const licenseDeniedResolution = {
  ...validResolution,
  rights: {
    ...validResolution.rights,
    permitsRedistribution: false
  }
};
