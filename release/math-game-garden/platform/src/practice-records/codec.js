import { encodeSnapshot, decodeSnapshot } from '../learning/attempt-snapshot.js';
import { practiceResolvedCount } from '../learning/attempt.js';
import { fail } from '../math/errors.js';
export const PRACTICE_RECORD_VERSION = 1;
const fields = ['answer', 'correction', 'numeratorMultiplier', 'denominatorMultiplier', 'transformedNumerator', 'transformedDenominator'];
export function encodePracticeRecord(state) {
  return { schemaVersion: PRACTICE_RECORD_VERSION, attemptSnapshot: encodeSnapshot(state.attempt), ui: {
    index: state.index, showResults: state.showResults,
    drafts: state.drafts.map(d => Object.fromEntries([...fields.map(f => [f, d[f]]), ['judgment', d.judgment], ['dirty', d.dirty]])),
  } };
}
export function migratePracticeRecord(input, migrations = {}) {
  let record = structuredClone(input);
  for (let step = 0; record?.schemaVersion !== PRACTICE_RECORD_VERSION && step < 8; step++) {
    const version = record?.schemaVersion;
    if (!Number.isInteger(version) || version >= PRACTICE_RECORD_VERSION || typeof migrations[version] !== 'function') fail('unsupported-record-version', '此回合格式版本尚未支援。');
    record = migrations[version](record);
    if (record?.schemaVersion !== version + 1) fail('invalid-record', '格式升級必須逐版進行。');
  }
  if (record?.schemaVersion !== PRACTICE_RECORD_VERSION) fail('unsupported-record-version', '此回合格式版本尚未支援。');
  return record;
}
export function decodePracticeRecord(input, { migrations = {} } = {}) {
  const record = migratePracticeRecord(input, migrations);
  if (record?.schemaVersion !== PRACTICE_RECORD_VERSION) fail('unsupported-record-version', '此回合格式版本尚未支援。');
  const attempt = decodeSnapshot(record.attemptSnapshot), ui = record.ui;
  if (attempt.mode !== 'practice' || attempt.unitId !== 'simplification') fail('invalid-record', '不是第一單元自主練習紀錄。');
  if (attempt.questions.some(q => q.schemaVersion !== 1 || q.templateVersion !== 1 || q.generatorVersion !== 1)) fail('unsupported-record-version', '題目版本尚未支援。');
  if (!ui || !Number.isInteger(ui.index) || ui.index < 0 || ui.index > 9 || typeof ui.showResults !== 'boolean' || !Array.isArray(ui.drafts) || ui.drafts.length !== 10) fail('invalid-record', '回合位置或草稿格式損壞。');
  const drafts = ui.drafts.map(d => {
    if (!d || fields.some(f => typeof d[f] !== 'string' || d[f].length > 256) || ![true, false, null].includes(d.judgment) || typeof d.dirty !== 'boolean') fail('invalid-record', '答案草稿格式損壞。');
    return Object.fromEntries([...fields.map(f => [f, d[f]]), ['judgment', d.judgment], ['dirty', d.dirty]]);
  });
  const resolvedCount = practiceResolvedCount(attempt);
  return { attempt, drafts, index: ui.index, showResults: ui.showResults && attempt.status === 'completed' && resolvedCount === 10, resolvedCount };
}
