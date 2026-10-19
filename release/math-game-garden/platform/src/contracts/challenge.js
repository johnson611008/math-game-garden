/**
 * B1 pure data contract/projections only. NOT a reducer, grader, repository or UI.
 * Evidence must come from a verified reducer/replayed snapshot (B2/B3), never
 * student-supplied accepted flags. Legacy LearningAttempt v2 is not reinterpreted.
 */
import { unitOneChallengePolicy } from '../config/policies.js';

export const CHALLENGE_CONTRACT_VERSION = 1;
export const CHALLENGE_PHASES = Object.freeze(['answering', 'awaiting-settlement', 'settled']);
export const CHALLENGE_RESPONSE_FIELDS = Object.freeze({
  'square-factor': Object.freeze(['squareFactor','remainder']),
  'decomposition-and-answer': Object.freeze(['squareFactor','remainder','answer','path']),
  'judgment-and-correction': Object.freeze(['isSimplest','correctedAnswer-if-false']),
  'rationalization-bundle': Object.freeze(['numeratorMultiplier','denominatorMultiplier','transformedNumerator','transformedDenominator','answer']),
});
export const CHALLENGE_EVENT_CONTRACT = Object.freeze({
  'start-challenge': 'explicit start through startChallenge; validated original questions and verified entry evidence',
  'challenge-edit': 'questionId, response: draft selections only; no mathematical feedback or first result',
  'challenge-submit': 'questionId, response: complete A/B/C bundle; reducer computes first/latest and subresults',
  'challenge-correct': 'questionId, response: complete correction bundle after first; first remains immutable',
  'challenge-step': 'questionId, response: full correction bundle alias after first, not a pre-first substep checker',
  'next-question': 'advance index only; does not submit or skip',
  'go-question': 'index: navigation only; preserves original questions and first results',
  skip: 'questionId, confirmed:true; creates one skipped first result and forbids later submission',
  hint: 'questionId, level:1|2; only after first, separately recorded from full answer views',
  'challenge-view-solution': 'questionId, confirmed:true; only after first; records answer use',
  'finish-challenge': 'confirmed:true; all 14 first results required; explicitly settles',
  'request-abandon': 'creates pending requestId without changing first results',
  'cancel-abandon': 'matching requestId; no grade changes',
  'confirm-abandon': 'matching requestId, confirmed:true; missing first become skipped; status abandoned',
  pause: 'reason:home|interruption|manual; preserves evidence',
  resume: 'restores original round; never generates replacement questions',
});
const invalid = message => { throw Object.assign(new Error(message), {code:'invalid-challenge-contract'}); };
const id = x => typeof x === 'string' && x.length > 0 && x.length <= 512;

/**
 * @typedef {Object} ChallengeEvidence
 * @property {1} schemaVersion Independent of legacy attempt v2.
 * @property {string} roundId
 * @property {'simplification'} unitId
 * @property {'challenge'} mode
 * @property {'in-progress'|'paused'|'completed'|'abandoned'} status
 * @property {{id:string,station:'A'|'B'|'C'}[]} questions Full Question snapshots in B2/B3.
 * @property {{questionId:string,first:{kind:'submitted'|'skipped',accepted:boolean,eventId:string}}[]} results
 * @property {{type:'finish-challenge'|'confirm-abandon',eventId:string,confirmed:true,requestId?:string}|null} settlement
 * @property {string|null} pendingAbandonRequestId Original request ID required for abandoned evidence.
 * @property {string} [abandonRequestId] Retained confirmed request ID after pending is cleared.
 *
 * first is immutable reducer evidence. latest/submissions/step/hint/solution records
 * are carried by the future full snapshot; this projection intentionally uses first only.
 * B2 must retain independent A decomposition/final, B judgment/correction/wholeCorrect,
 * C multiplier/synchronized/final/wholeCorrect results. Syntax failures do not create first.
 */
export function inspectChallengeRound(evidence) {
  const e = evidence;
  if (e?.schemaVersion !== 1 || !id(e.roundId) || e.unitId !== 'simplification' || e.mode !== 'challenge' || !['in-progress','paused','completed','abandoned'].includes(e.status)) invalid('未知的挑戰證據格式。');
  if (!Array.isArray(e.questions) || e.questions.length !== 14 || !Array.isArray(e.results)) invalid('挑戰須有14題與首次證據。');
  const ids = new Set(), stations = {A:0,B:0,C:0};
  for (const q of e.questions) {
    if (!id(q?.id) || ids.has(q.id) || !Object.hasOwn(stations,q.station)) invalid('題目識別碼或工作站無效。');
    ids.add(q.id); stations[q.station]++;
  }
  if (stations.A !== 4 || stations.B !== 6 || stations.C !== 4) invalid('挑戰配額必須A4/B6/C4。');
  const seen = new Set(); let correct = 0;
  for (const row of e.results) {
    const f = row?.first;
    if (!ids.has(row?.questionId) || seen.has(row.questionId) || !f || !['submitted','skipped'].includes(f.kind) || typeof f.accepted !== 'boolean' || !id(f.eventId) || (f.kind === 'skipped' && f.accepted)) invalid('首次證據無效或重複。');
    seen.add(row.questionId); if (f.accepted) correct++;
  }
  const terminal = ['completed','abandoned'].includes(e.status);
  if (terminal) {
    const s=e.settlement;
    if (seen.size !== 14 || s?.confirmed !== true || !id(s.eventId) || s.type !== (e.status==='completed'?'finish-challenge':'confirm-abandon')) invalid('終局須有完整首次紀錄與明確結算證據。');
    if (e.status==='abandoned' && (!id(s.requestId) || s.requestId !== e.abandonRequestId)) invalid('放棄須有相符的原始requestId證據。');
    if (e.pendingAbandonRequestId != null) invalid('終局不可仍有待確認放棄要求。');
  } else if (e.settlement != null) invalid('未結算回合不可攜帶結算結果。');
  if (e.pendingAbandonRequestId != null && !id(e.pendingAbandonRequestId)) invalid('放棄要求識別碼無效。');
  const allFirst = seen.size === 14;
  const thresholdSatisfied = allFirst ? correct >= unitOneChallengePolicy.minFirstAttemptCorrect : null;
  return {
    schemaVersion:1, roundId:e.roundId, status:e.status,
    phase:terminal?'settled':allFirst?'awaiting-settlement':'answering',
    questionCount:14, firstResultCount:seen.size, firstCorrectCount:correct,
    scoreThresholdReached:correct >= unitOneChallengePolicy.minFirstAttemptCorrect,
    thresholdSatisfied, completedAndPassed:e.status==='completed' && thresholdSatisfied===true,
    nextRequirement:!terminal?null:!thresholdSatisfied?'remediation-required':e.status==='abandoned'?'formal-completion-policy-required':'none',
    canCorrect:!terminal && e.status==='in-progress' && !e.pendingAbandonRequestId,
    canFinish:!terminal && allFirst && e.status==='in-progress' && !e.pendingAbandonRequestId,
  };
}

/** Describes legacy abandonment semantics without mutating or settling a round. */
export function describeChallengeAbandonment(evidence) {
  const summary=inspectChallengeRound(evidence);
  if (summary.phase==='settled') invalid('已結算回合不能再次放棄。');
  const firstIds=new Set(evidence.results.map(r=>r.questionId));
  return { missingFirstQuestionIds:evidence.questions.filter(q=>!firstIds.has(q.id)).map(q=>q.id),
    fillKind:'skipped', fillAccepted:false, preservedFirstCorrectCount:summary.firstCorrectCount,
    requiresMatchingConfirmation:true };
}

/**
 * Pure admission contract. Caller must load ALL unresolved rounds/requirements,
 * not merely the latest result. B1 does not supply persistence or an unlock API.
 * Repeated identical round evidence is idempotent; conflicting copies fail closed.
 */
export function inspectChallengeEntry({schemaVersion, integrity, rounds} = {}) {
  const blocked=reason=>({decision:'storage-blocked',canStartNew:false,reason});
  if (schemaVersion!==1 || integrity!=='verified' || !Array.isArray(rounds)) return blocked('unverified-evidence');
  const unique=new Map();
  try {
    for(const e of rounds) {
      const s=inspectChallengeRound(e);
      const canonical=JSON.stringify(s);
      if(unique.has(s.roundId) && unique.get(s.roundId).canonical!==canonical) return blocked('conflicting-round-evidence');
      // Full evidence conflicts (including changed first answers) must also fail closed.
      const raw=JSON.stringify(e);
      if(unique.has(s.roundId) && unique.get(s.roundId).raw!==raw) return blocked('conflicting-round-evidence');
      unique.set(s.roundId,{canonical,raw,summary:s});
    }
  } catch { return blocked('invalid-round-evidence'); }
  const summaries=[...unique.values()].map(x=>x.summary);
  const active=summaries.filter(s=>s.phase!=='settled');
  if(active.length>1) return blocked('multiple-unfinished-rounds');
  const remediation=summaries.filter(s=>s.nextRequirement==='remediation-required');
  const abandoned=summaries.filter(s=>s.nextRequirement==='formal-completion-policy-required');
  if(active.length && (remediation.length || abandoned.length)) return blocked('unfinished-round-conflicts-with-prior-requirement');
  if(active.length) return {decision:'resume-existing',canStartNew:false,roundId:active[0].roundId,phase:active[0].phase};
  if(remediation.length) return {decision:'remediation-required',canStartNew:false,sourceRoundIds:remediation.map(s=>s.roundId)};
  if(abandoned.length) return {decision:'abandoned-unpassed',canStartNew:false,sourceRoundIds:abandoned.map(s=>s.roundId),reason:'formal-completion-policy-required'};
  return {decision:'startable',canStartNew:true};
}
