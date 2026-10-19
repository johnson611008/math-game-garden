import { createAttempt, applyAttemptEvent } from './attempt.js';
import { fail } from '../math/errors.js';
export function encodeSnapshot(attempt) {
  return JSON.stringify({ schemaVersion: 2, header: { id: attempt.id, mode: attempt.mode, questions: attempt.questions, startedAt: attempt.startedAt, remediationForAttemptId: attempt.remediationForAttemptId }, events: attempt.events });
}
export function decodeSnapshot(text) {
  if (typeof text !== 'string' || text.length > 2000000) fail('resource-limit', '快照過大或不是文字。');
  let data; try { data = JSON.parse(text); } catch { fail('invalid-contract', '快照不是有效 JSON。'); }
  if (data?.schemaVersion !== 2 || !data.header || !Array.isArray(data.events) || data.events.length > 2000) fail('invalid-contract', '不支援的快照版本或格式。');
  // Re-evaluate original responses rather than trusting cached scores from the snapshot.
  return data.events.reduce(applyAttemptEvent, createAttempt(data.header));
}
