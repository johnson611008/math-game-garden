import { generateQuestions } from '../questions/generator.js';
import { createAttempt, applyAttemptEvent, practiceResolvedCount } from '../learning/attempt.js';
import { planHint } from '../assessment/hint-planner.js';
import { diagnose } from '../assessment/diagnostic-rules.js';
import { decodePracticeRecord } from '../practice-records/codec.js';

const blank = () => ({ answer: '', judgment: null, correction: '', numeratorMultiplier: '', denominatorMultiplier: '', transformedNumerator: '', transformedDenominator: '', dirty: false });
const clone = value => structuredClone(value);
let sequence = 0;
export function freshSeed(random = globalThis.crypto) {
  if (typeof random?.randomUUID === 'function') return random.randomUUID();
  if (typeof random?.getRandomValues === 'function') return [...random.getRandomValues(new Uint32Array(4))].map(n => n.toString(16).padStart(8, '0')).join('');
  // Seed selection only; mathematical answers are always evaluated with BigInt rationals.
  return `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2)}`;
}
export function createPracticeSession({ seed = freshSeed(), now = () => new Date().toISOString(), savedRecord = null } = {}) {
  const restored = savedRecord ? decodePracticeRecord(savedRecord) : null;
  const questions = restored?.attempt.questions || generateQuestions({ unitId: 'simplification', mode: 'practice', count: 10, seed });
  let attempt = restored?.attempt || createAttempt({ id: `practice:${seed}`, mode: 'practice', questions, startedAt: now() });
  let index = restored?.index || 0, showResults = restored?.showResults || false, serial = 0, version = 0;
  const drafts = restored?.drafts || questions.map(blank), listeners = new Set();
  const prefix = `${attempt.id}:event:`;
  for (const e of attempt.events) if (e.id.startsWith(prefix) && /^\d{1,6}$/.test(e.id.slice(prefix.length))) serial = Math.max(serial, Number(e.id.slice(prefix.length)));
  function emit(type, payload = {}) {
    const latestTime = attempt.events.at(-1)?.at || attempt.startedAt;
    const at = new Date(Math.max(Date.parse(now()), Date.parse(latestTime))).toISOString();
    attempt = applyAttemptEvent(attempt, { id: `${attempt.id}:event:${++serial}`, type, at, ...payload });
    version++;
  }
  const question = () => questions[index];
  const record = () => attempt.responses[question().id];
  function concept() {
    const r = record();
    const diagnosis = r?.latest?.diagnosis || (r?.submissions?.at(-1)?.result ? diagnose(r.submissions.at(-1).result, question()) : []);
    return diagnosis.find(d => d.conceptId !== 'other-math-error')?.conceptId || question().conceptTags[0];
  }
  const api = {
    getState() { return clone({ attempt, index, drafts, showResults, resolvedCount: practiceResolvedCount(attempt) }); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    update(field, value) {
      if (attempt.status !== 'in-progress' || !Object.hasOwn(drafts[index], field) || field === 'dirty') return;
      if (field === 'judgment' ? ![true, false, null].includes(value) : typeof value !== 'string' || value.length > 256) return;
      if (drafts[index][field] !== value) { drafts[index][field] = value; drafts[index].dirty = true; version++; }
    },
    submit() {
      if (attempt.status !== 'in-progress') return null;
      const d = drafts[index], q = question();
      const response = q.station === 'B' ? { isSimplest: d.judgment, ...(d.judgment === false ? { correctedAnswer: d.correction } : {}) } : { answer: d.answer };
      emit('submit', { questionId: q.id, response }); drafts[index].dirty = false;
      const result = record().submissions.at(-1).result;
      if (result.consumesFirst && !result.accepted && !record().hints?.some(h => h.level === 1)) emit('hint', { questionId: q.id, level: 1, source: 'feedback', conceptId: concept() });
      return clone(result);
    },
    hint() {
      if (!['in-progress', 'completed'].includes(attempt.status)) return;
      const level = (record()?.hints || []).reduce((max, h) => Math.max(max, h.level), 0);
      if (level < 2) emit('hint', { questionId: question().id, level: level + 1, source: 'student', conceptId: concept() });
    },
    hintText() {
      return (record()?.hints || []).filter(h => h.level < 3).map(h => ({ ...h, text: h.text || planHint(question(), h.conceptId || concept(), h.level).text }));
    },
    solution() {
      if (!['in-progress', 'completed'].includes(attempt.status)) return;
      if (!record()?.solutionViews?.length) emit('view-solution', { questionId: question().id, confirmed: true });
    },
    step(step) {
      if (attempt.status !== 'in-progress' || question().station !== 'C') return null;
      const { numeratorMultiplier, denominatorMultiplier, transformedNumerator, transformedDenominator } = drafts[index];
      emit('practice-step', { questionId: question().id, step, response: { numeratorMultiplier, denominatorMultiplier, transformedNumerator, transformedDenominator } });
      return clone(record().steps.at(-1).result);
    },
    go(position) { if (Number.isInteger(position) && position >= 0 && position < 10 && (index !== position || showResults)) { index = position; showResults = false; version++; } },
    results() { if (practiceResolvedCount(attempt) === 10 && !showResults) { showResults = true; version++; } },
    pause(reason = 'home') { if (attempt.status === 'in-progress') emit('pause', { reason }); },
    resume() { if (attempt.status === 'paused') emit('resume'); },
    requestAbandon() { if (['in-progress', 'paused'].includes(attempt.status) && !attempt.pendingAbandonRequestId) emit('request-abandon'); },
    cancelAbandon() { if (attempt.pendingAbandonRequestId) emit('cancel-abandon', { requestId: attempt.pendingAbandonRequestId }); },
    confirmAbandon() { if (attempt.pendingAbandonRequestId) emit('confirm-abandon', { requestId: attempt.pendingAbandonRequestId, confirmed: true }); },
  };
  for (const name of ['update', 'submit', 'hint', 'solution', 'step', 'go', 'results', 'pause', 'resume', 'requestAbandon', 'cancelAbandon', 'confirmAbandon']) {
    const operation = api[name];
    api[name] = (...args) => { const before = version; try { return operation(...args); } finally { if (version !== before) for (const listener of listeners) listener(api.getState()); } };
  }
  return api;
}
export function practiceSummary(state) {
  const records = Object.values(state.attempt.responses);
  return {
    firstCorrect: records.filter(r => r.first?.accepted).length,
    currentlyCorrect: records.filter(r => r.latest?.accepted).length,
    answersViewed: records.filter(r => r.solutionViews?.length || r.hints?.some(h => h.revealsAnswer)).length,
    hintActions: records.reduce((n, r) => n + (r.hints?.length || 0), 0),
    resolved: state.resolvedCount, total: 10,
  };
}
