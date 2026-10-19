import { evaluate } from '../assessment/evaluator.js';
import { diagnose } from '../assessment/diagnostic-rules.js';
import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { deserialize, equivalent } from '../math/radical-value.js';
import { inspectSimplest } from '../math/form-checker.js';
import { largestSquareFactor } from '../math/integer-factorization.js';
import { fail } from '../math/errors.js';
import { unitOneChallengePolicy } from '../config/policies.js';
import { evaluateMultiplier, evaluateSynchronizedOperation } from '../assessment/steps.js';
import { planHint } from '../assessment/hint-planner.js';
import { validatePowerPresentation } from '../questions/power-presentation.js';

const copy = value => JSON.parse(JSON.stringify(value));
const stable = value => JSON.stringify(value, function (_key, item) { return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item; });
function id(value) { if (typeof value !== 'string' || !value || value.length > 512 || ['__proto__', 'constructor', 'prototype'].includes(value)) fail('invalid-contract', '缺少有效識別碼。'); }
function timestamp(value) { if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail('invalid-contract', '時間必須為 UTC ISO 8601。'); }
function validateQuestion(q) {
  validatePowerPresentation(q);
  id(q.id);
  if (q.schemaVersion !== 1 || q.unitId !== 'simplification' || !['A', 'B', 'C'].includes(q.station) || !['simplify', 'largest-square-factor', 'judge-and-correct', 'rationalize-monomial-denominator'].includes(q.taskType)) fail('invalid-contract', '不支援的題目契約。');
  const ast = parse(q.source), expected = deserialize(q.answerSpec.expectedValue);
  if (stable(ast) !== stable(q.expressionAst)) fail('invalid-contract', '題目 AST 與來源不一致。');
  if (q.answerSpec.requiredForm !== 'simplest-monomial') fail('invalid-contract', '未知的作答形式。');
  if (q.taskType === 'largest-square-factor') {
    if (!/^[1-9][0-9]{0,5}$/.test(q.decompositionSpec?.radicand)) fail('invalid-contract', '無效的平方因數題目。');
    const n = q.decompositionSpec.radicand;
    if (q.source !== `sqrt(${n})` || !equivalent(expected, evaluateAst(parse(String(largestSquareFactor(BigInt(n))))))) fail('invalid-contract', '最大平方因數答案錯誤。');
  } else if (!equivalent(evaluateAst(ast), expected)) fail('invalid-contract', '題目與答案不一致。');
  if (q.taskType === 'judge-and-correct' && (q.station !== 'B' || q.answerSpec.isSimplest !== inspectSimplest(ast).satisfied)) fail('invalid-contract', 'B 站判斷契約不一致。');
}
export function createAttempt({ id: attemptId, mode, questions, startedAt, remediationForAttemptId = null }) {
  id(attemptId); timestamp(startedAt);
  const count = mode === 'challenge' ? 14 : 10;
  if (!['practice', 'challenge', 'remediation'].includes(mode) || !Array.isArray(questions) || questions.length !== count) fail('invalid-contract', '回合模式或題數不符。');
  if (mode === 'remediation') id(remediationForAttemptId);
  else if (remediationForAttemptId !== null) fail('invalid-contract', '非補救回合不可指定補救來源。');
  const counts = { A: 0, B: 0, C: 0 }, ids = new Set();
  for (const q of questions) { validateQuestion(q); if (ids.has(q.id)) fail('invalid-contract', '題目 ID 重複。'); ids.add(q.id); counts[q.station]++; }
  const quota = mode === 'challenge' ? [4, 6, 4] : [4, 3, 3];
  if (mode === 'remediation' ? Object.values(counts).some(n => n < 2 || n > 6) : ['A', 'B', 'C'].some((s, i) => counts[s] !== quota[i])) fail('invalid-contract', '回合工作站配額不符。');
  return { schemaVersion: 2, id: attemptId, unitId: 'simplification', mode, status: 'in-progress',
    questions: copy(questions), questionCount: count, responses: {}, events: [],
    startedAt, completedAt: null, completedCount: 0, correctCount: null, firstAttemptCorrectCount: null,
    remediationForAttemptId, pendingAbandonRequestId: null };
}
function updateCounts(attempt) {
  const responses = Object.values(attempt.responses);
  attempt.completedCount = responses.filter(r => r.first).length;
  attempt.firstAttemptCorrectCount = attempt.completedCount ? responses.filter(r => r.first?.accepted).length : null;
  attempt.correctCount = attempt.completedCount ? responses.filter(r => r.latest?.accepted).length : null;
}
export function practiceResolvedCount(attempt) {
  return attempt.questions.filter(q => {
    const r = attempt.responses[q.id];
    return !!(r?.latest?.accepted || r?.solutionViews?.length);
  }).length;
}
export function applyAttemptEvent(current, event) {
  id(event.id); timestamp(event.at);
  const duplicate = current.events.find(old => old.id === event.id);
  if (duplicate) { if (stable(duplicate) !== stable(event)) fail('event-conflict', '事件 ID 已存在但內容不同。'); return current; }
  if (current.events.length >= 2000) fail('resource-limit', '回合事件超過上限。');
  if (Date.parse(event.at) < Date.parse(current.events.at(-1)?.at || current.startedAt)) fail('invalid-contract', '事件時間不可倒退。');
  const review = current.mode === 'practice' && current.status === 'completed' && ['view-solution', 'hint'].includes(event.type);
  if (!['in-progress', 'paused'].includes(current.status) && !review) fail('invalid-state', '此回合已結束。');
  const next = copy(current), active = current.status === 'in-progress';
  if (event.type === 'pause') {
    if (!active || !['home', 'interruption', 'manual'].includes(event.reason)) fail('invalid-state', '暫停事件無效。');
    next.status = 'paused';
  } else if (event.type === 'resume') {
    if (active) fail('invalid-state', '回合未暫停。'); next.status = 'in-progress';
  } else if (event.type === 'request-abandon') {
    if (next.pendingAbandonRequestId) fail('invalid-state', '已有待確認的放棄要求。'); next.pendingAbandonRequestId = event.id;
  } else if (event.type === 'cancel-abandon' || event.type === 'confirm-abandon') {
    if (!next.pendingAbandonRequestId || event.requestId !== next.pendingAbandonRequestId) fail('invalid-state', '缺少對應的放棄確認要求。');
    if (event.type === 'confirm-abandon') {
      if (event.confirmed !== true) fail('invalid-state', '必須明確確認放棄。');
      for (const q of next.questions) if (!next.responses[q.id]?.first) {
        const skipped = { kind: 'skipped', accepted: false, eventId: event.id, reason: 'confirmed-abandon' };
        const previous = next.responses[q.id] || {};
        next.responses[q.id] = { ...previous, first: skipped, latest: skipped, submissions: previous.submissions || [] };
      }
      next.status = 'abandoned'; next.completedAt = event.at;
    }
    next.pendingAbandonRequestId = null;
  } else if (['submit', 'skip', 'hint', 'view-solution', 'practice-step'].includes(event.type)) {
    if ((!active && !review) || next.pendingAbandonRequestId) fail('invalid-state', '暫停或等待放棄確認時不可作答。');
    const question = next.questions.find(q => q.id === event.questionId);
    if (!question) fail('invalid-contract', '找不到題目。');
    const record = next.responses[question.id] ||= { first: null, latest: null, submissions: [] };
    if (event.type === 'view-solution') {
      if (next.mode !== 'practice' || event.confirmed !== true) fail('invalid-state', '完整解答必須由學生明確選擇查看。');
      (record.solutionViews ||= []).push({ eventId: event.id, at: event.at, revealedBeforeCorrect: !record.latest?.accepted });
      if (!record.first) record.first = { kind: 'revealed', accepted: false, eventId: event.id, reason: 'answer-viewed' };
    } else if (event.type === 'practice-step') {
      if (next.mode !== 'practice' || question.station !== 'C') fail('invalid-state', '此題不支援自主練習的有理化步驟。');
      // Step outcomes are computed from the original expressions, never supplied grades.
      const result = event.step === 'multiplier'
        ? evaluateMultiplier(question.stepSpec.denominator, event.response?.denominatorMultiplier)
        : event.step === 'synchronized'
          ? evaluateSynchronizedOperation({ ...event.response, numerator: question.stepSpec.numerator, denominator: question.stepSpec.denominator })
          : null;
      if (!result) fail('invalid-contract', '未知的有理化步驟。');
      (record.steps ||= []).push({ eventId: event.id, at: event.at, step: event.step, response: copy(event.response || {}), result });
    } else if (event.type === 'hint') {
      if (![1, 2, 3].includes(event.level) || (next.mode === 'challenge' && !record.first)) fail('invalid-state', '目前不可使用此提示。');
      const conceptId = event.conceptId || record.latest?.diagnosis?.[0]?.conceptId || question.conceptTags[0];
      (record.hints ||= []).push({ eventId: event.id, at: event.at, level: event.level, revealsAnswer: event.level === 3, source: event.source || 'student', conceptId, text: planHint(question, conceptId, event.level).text });
    } else if (event.type === 'skip') {
      if (record.first) fail('invalid-state', '已完成首次作答的題目不能改成跳題。');
      record.first = record.latest = { kind: 'skipped', accepted: false, eventId: event.id, reason: 'explicit-skip' };
    } else {
      if (record.first?.kind === 'skipped') fail('invalid-state', '已跳過的題目不可再提交。');
      const result = evaluate(question, event.response), submission = { kind: 'submitted', eventId: event.id, at: event.at, response: copy(event.response || {}), result, accepted: result.accepted, diagnosis: result.consumesFirst ? diagnose(result, question) : [] };
      record.submissions.push(submission);
      if (result.consumesFirst) {
        if (!record.first) record.first = record.hints?.some(h => h.revealsAnswer)
          ? { ...submission, accepted: false, assistedByAnswer: true }
          : submission;
        record.latest = submission;
      }
    }
  } else fail('invalid-contract', '未知的學習事件。');
  next.events.push(copy(event)); updateCounts(next);
  const finished = next.mode === 'practice' ? practiceResolvedCount(next) === next.questionCount : next.completedCount === next.questionCount;
  if (finished && next.status === 'in-progress') { next.status = 'completed'; next.completedAt = event.at; }
  return next;
}
// Read-only summary: does not unlock eligibility or start any remediation flow.
export function summarizeAttempt(attempt) {
  const ended = ['completed', 'abandoned'].includes(attempt.status), first = attempt.firstAttemptCorrectCount;
  const threshold = attempt.mode === 'challenge' ? unitOneChallengePolicy.minFirstAttemptCorrect : attempt.mode === 'remediation' ? unitOneChallengePolicy.remediation.minCorrect : null;
  return { completedCount: attempt.completedCount, firstAttemptCorrectCount: first,
    thresholdSatisfied: threshold === null || !ended ? null : (attempt.mode === 'challenge' || attempt.status === 'completed') && attempt.completedCount === attempt.questionCount && first >= threshold };
}
