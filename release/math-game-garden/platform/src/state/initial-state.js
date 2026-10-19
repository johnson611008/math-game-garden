import { LEARNING_SCHEMA_VERSION } from '../contracts/learning.js';
export function createInitialState(units) {
  return {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    unitStates: units.map(({ id }) => ({
      unitId: id, challengeAccess: 'not-evaluated',
      requiredRemediationForAttemptId: null, attempts: [],
    })),
  };
}
