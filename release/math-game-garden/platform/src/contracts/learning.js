/** Platform availability is independent of a learner's challenge access. */
export const UNIT_AVAILABILITY = Object.freeze(['in-development', 'unreleased', 'available']);
export const CHALLENGE_ACCESS = Object.freeze(['not-evaluated', 'eligible', 'remediation-required']);
export const ATTEMPT_STATUS = Object.freeze(['in-progress', 'paused', 'completed', 'abandoned']);
/**
 * @typedef {Object} LearningAttempt
 * @property {string} id Unique round identifier.
 * @property {string} unitId
 * @property {'practice'|'challenge'|'remediation'} mode
 * @property {'in-progress'|'paused'|'completed'|'abandoned'} status
 * @property {number} questionCount
 * @property {number} completedCount
 * @property {number|null} correctCount Null until measured; never an invented score.
 * @property {number|null} firstAttemptCorrectCount One first submission per question.
 * @property {string} startedAt ISO 8601 timestamp.
 * @property {string|null} completedAt
 * @property {string|null} remediationForAttemptId Source failed challenge, if applicable.
 * @property {2} schemaVersion
 * @property {import('./questions.js').Question[]} questions
 * @property {Object<string, {first:Object|null,latest:Object|null,submissions:Object[],hints?:Object[]}>} responses
 * @property {Object[]} events Each event has id, type, UTC at and type-specific payload.
 * @property {string|null} pendingAbandonRequestId
 *
 * @typedef {Object} UnitLearningState
 * @property {string} unitId
 * @property {'not-evaluated'|'eligible'|'remediation-required'} challengeAccess
 * @property {string|null} requiredRemediationForAttemptId
 * @property {LearningAttempt[]} attempts
 *
 * Contract invariants for future implementations:
 * - Unreleased units cannot be entered even if challengeAccess is eligible.
 * - A failed unit-one challenge requires remediation before another challenge.
 * - Remediation must complete all 10 questions with at least 8 correct.
 * - A challenge passes with at least 11 first-attempt correct out of 14.
 * - WP02 pure attempt events never change UnitLearningState.challengeAccess.
 * - Returning home/interruption emits pause; resume keeps questions and first answers.
 * - Abandon requires request-abandon then confirm-abandon with matching requestId
 *   and confirmed:true. Cancel leaves first answers untouched. UI confirmation is deferred.
 * - skip consumes the first opportunity. Invalid syntax/unsupported/resource-limit do not.
 * - Domain errors and equivalent-but-not-simplest consume the first opportunity.
 * - Each question record preserves first/latest/submissions; B subresults stay in result.
 * - Events have id/type/at; repeated identical IDs are idempotent; conflicting reuse fails.
 * - Snapshots v2 store questions and original events, and recompute results on decode.
 * - WP03-B practice-only additions: view-solution{questionId,confirmed:true} stores
 *   solutionViews separately; before any answer it records first.kind='revealed',
 *   accepted:false. Later mathematical correctness cannot backfill that first result.
 * - practice-step{questionId,step:'multiplier'|'synchronized',response} computes C step
 *   results from the original question and stores steps; it does not consume final first.
 * - Hints retain conceptId/text/source and at; legacy level-3 hints before first cannot
 *   produce an unaided first-correct record on later submission.
 * - Practice completes after each question has a correct latest valid answer or an
 *   explicit solution view. Ten initial wrong answers remain open for correction.
 *   completedCount still counts questions with a first record; practiceResolvedCount
 *   supplies actual resolved-question progress. Challenge/remediation rules unchanged.
 * - Completed practice can log solution/hint review but cannot change answer grades.
 * - No practice event changes challengeAccess; no threshold or remediation unlock.
 * - WP03-C persists the full attempt snapshot plus UI drafts/index/results at the
 *   independent practice-record schema v1; scores are recomputed from original events.
 * - Explicit abandonment preserves invalid submissions, prior hints and C steps;
 *   it creates skip records only for missing first results and never claims completion.
 * - v1 has no event/snapshot data; existing empty UnitLearningState remains compatible.
 */
export const LEARNING_SCHEMA_VERSION = 2;
