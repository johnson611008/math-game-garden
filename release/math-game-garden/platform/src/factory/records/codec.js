import { challengeReplayData, replayChallenge, challengeEvidence } from '../../learning/challenge-events.js';
import { inspectChallengeEntry } from '../../contracts/challenge.js';
import {isDirectQuestion} from '../../rpg-factory/direct-contract.js';

export const CHALLENGE_RECORD_VERSION=1;
export const CHALLENGE_STORE_VERSION=1;
export const MAX_STORE_CHARS=8000000;
export function recordError(code,message) {return Object.assign(new Error(message),{code});}
export function stable(value,depth=0) {
  if(depth>100)throw recordError('invalid-json-value','資料結構過深。');
  if(value===null||typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)))return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(v=>stable(v,depth+1)).join(',')}]`;
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).some(k=>['__proto__','constructor','prototype'].includes(k)))throw recordError('invalid-json-value','資料必須是有限的JSON值。');
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k],depth+1)}`).join(',')}}`;
}
export const copy=value=>JSON.parse(JSON.stringify(value));
export function encodeChallengeRecord(state) {
  const replay=challengeReplayData(state), verified=replayChallenge(replay);
  if(stable(state)!==stable(verified))throw recordError('snapshot-mismatch','畫面狀態與原始事件回放不一致，停止保存。');
  return {schemaVersion:1,replay,snapshot:copy(verified)};
}
export function decodeChallengeRecord(record) {
  if(record?.schemaVersion!==1)throw recordError('unsupported-record-version','挑戰紀錄版本尚未支援。');
  const qs=record.replay?.header?.questions;
  if(!Array.isArray(qs)||qs.some(q=>q?.schemaVersion!==1||q.templateVersion!==1||q.generatorVersion!==1||!(q.challengeContractVersion===1&&q.interactionSpec?.schemaVersion===1||isDirectQuestion(q))))throw recordError('unsupported-question-version','題目或互動版本尚未支援。');
  const state=replayChallenge(record.replay);
  if(stable(record.snapshot)!==stable(state))throw recordError('snapshot-mismatch','事件與首次結果／快照不一致，停止自動恢復。');
  return state;
}
/** All records must validate: an isolated failure must not hide an old unmet requirement. */
export function decodeChallengeStore(raw) {
  if(raw===null)return {document:{schemaVersion:1,revision:0,activeRoundId:null,records:[]},states:[],entry:{schemaVersion:1,integrity:'verified',rounds:[]}};
  if(typeof raw!=='string'||raw.length>MAX_STORE_CHARS)throw recordError('invalid-store','挑戰資料過大或無效。');
  let d;try{d=JSON.parse(raw);}catch{throw recordError('invalid-json','挑戰資料無法解析，原始內容已保留。');}
  if(d?.schemaVersion!==1)throw recordError('unsupported-store-version','挑戰儲存版本尚未支援。');
  if(!Number.isSafeInteger(d.revision)||d.revision<1||!Array.isArray(d.records)||d.records.length<1||d.records.length>1000)throw recordError('invalid-store','挑戰索引／版本資料無效。');
  const states=d.records.map(decodeChallengeRecord), ids=new Set(states.map(s=>s.roundId));
  if(ids.size!==states.length||typeof d.activeRoundId!=='string'||!ids.has(d.activeRoundId))throw recordError('invalid-store','回合識別碼重複或活動指標無效。');
  const entry={schemaVersion:1,integrity:'verified',rounds:states.map(challengeEvidence)};
  const admission=inspectChallengeEntry(entry);
  if(admission.decision==='storage-blocked')throw recordError('inconsistent-history','回合歷史互相衝突，停止自動恢復。');
  if(admission.decision==='resume-existing'&&admission.roundId!==d.activeRoundId)throw recordError('invalid-store','未完成回合未指向原回合。');
  return {document:d,states,entry};
}
