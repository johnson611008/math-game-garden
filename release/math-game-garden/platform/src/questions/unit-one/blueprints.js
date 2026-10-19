import { unitOneAllocations } from '../../config/policies.js';
export const BLUEPRINTS = Object.freeze({ challenge: unitOneAllocations.challenge, practice: unitOneAllocations.practice, remediation: unitOneAllocations.remediationDefault });
export const ROOTS = Object.freeze([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
export function difficultyAt(station, index, mode) {
  if (station === 'B' || (mode !== 'challenge' && station === 'C')) return [1, 2, 3][index % 3];
  return [1, 2, 2, 3][index % 4];
}
