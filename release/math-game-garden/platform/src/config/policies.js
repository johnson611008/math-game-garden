// Declarative policy. No UI, persistence, or eligibility-unlock flow.
export const practicePolicy = Object.freeze({ questionCount: 10, repeatLimit: null });
export const unitOneAllocations = Object.freeze({
  challenge: Object.freeze({ A: 4, B: 6, C: 4 }),
  practice: Object.freeze({ A: 4, B: 3, C: 3 }),
  remediationDefault: Object.freeze({ A: 4, B: 3, C: 3 }),
});
export const unitOneChallengePolicy = Object.freeze({
  unitId: 'simplification', questionCount: 14, minFirstAttemptCorrect: 11,
  belowThresholdRequirement: 'remediation-required',
  remediation: Object.freeze({ questionCount: 10, minCorrect: 8, completionRequired: true }),
});
