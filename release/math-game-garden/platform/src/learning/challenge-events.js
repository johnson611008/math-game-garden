import { createAttempt } from './attempt.js';
import { inspectChallengeRound, inspectChallengeEntry } from '../contracts/challenge.js';
import { evaluateChallengeBundle } from '../assessment/challenge-composite.js';
import { planHint } from '../assessment/hint-planner.js';
import { fail } from '../math/errors.js';
import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { equivalent } from '../math/radical-value.js';
import {isDirectQuestion,directResponse,evaluateDirectAnswer} from '../rpg-factory/direct-contract.js';

export const CHALLENGE_EVENT_VERSION=1;
const clone=x=>JSON.parse(JSON.stringify(x));
function canonical(x) {
  if(x===null||typeof x==='string'||typeof x==='boolean') return JSON.stringify(x);
  if(typeof x==='number'&&Number.isFinite(x)) return JSON.stringify(x);
  if(Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
  if(x&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))) {
    if(Object.keys(x).some(k=>['__proto__','constructor','prototype'].includes(k))) fail('invalid-contract','不允許的資料鍵。');
    return `{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
  }
  fail('invalid-contract','事件必須是有限的JSON資料。');
}
function json(x,max=2000000) {let text;try{text=canonical(x);}catch(e){if(e.code)throw e;fail('invalid-contract','資料結構過深或不是JSON。');}if(text.length>max)fail('resource-limit','資料超出限制。');return clone(x);}
function id(x) {if(typeof x!=='string'||!x||x.length>512||['__proto__','constructor','prototype'].includes(x))fail('invalid-contract','缺少有效識別碼。');}
function time(x) {if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)||!Number.isFinite(Date.parse(x)))fail('invalid-contract','時間須為UTC ISO字串。');}
function responseFor(q,input={}) {
  if(isDirectQuestion(q))return json(directResponse(q,input),16000);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid-contract','作答須為物件。');
  const fields=q.station==='A'?['squareFactor','remainder',...(q.taskType==='simplify'?['answer','path']:[])]:q.station==='B'?['isSimplest','correctedAnswer']:['numeratorMultiplier','denominatorMultiplier','transformedNumerator','transformedDenominator','answer'];
  return Object.fromEntries(fields.filter(f=>Object.hasOwn(input,f)).map(f=>[f,json(input[f],16000)]));
}
function evidence(s) {
  return {schemaVersion:1,roundId:s.roundId,unitId:s.unitId,mode:s.mode,status:s.status,questions:s.questions,
    results:s.questions.filter(q=>s.responses[q.id]?.first).map(q=>({questionId:q.id,first:s.responses[q.id].first})),
    settlement:s.settlement,pendingAbandonRequestId:s.pendingAbandonRequestId,...(s.abandonRequestId?{abandonRequestId:s.abandonRequestId}:{})};
}
export const challengeEvidence=state=>clone(evidence(state));
export const challengeSummary=state=>inspectChallengeRound(evidence(state));

/** Begin is explicit; all prior verified rounds must be supplied by the B3 caller. */
export function startChallenge({roundId,questions,at,eventId,entry}={}) {
  const admission=inspectChallengeEntry(entry);
  if(!admission.canStartNew)fail('challenge-entry-blocked',`不可建立新挑戰：${admission.decision}`);
  if(entry.rounds.some(r=>r.roundId===roundId))fail('event-conflict','回合識別碼不能重用。');
  id(roundId);id(eventId);time(at);
  const qs=json(questions);
  createAttempt({id:roundId,mode:'challenge',questions:qs,startedAt:at}); // Reuse trusted legacy question validation, never its reducer.
  if(new Set(qs.map(q=>q.challengeContractVersion)).size!==1)fail('invalid-contract','同回合不可混用完整包與 RPG 判分版本。');
  for(const q of qs) {
    if(isDirectQuestion(q)){
      if(q.station==='A'&&q.taskType!=='simplify'||q.station==='B'&&q.taskType!=='judge-and-correct'||q.station==='C'&&q.taskType!=='rationalize-monomial-denominator')fail('invalid-contract','RPG 工作站題型不符。');
      continue;
    }
    const kind=q.station==='A'?q.taskType==='largest-square-factor'?'square-factor':'decomposition-and-answer':q.station==='B'?'judgment-and-correction':'rationalization-bundle';
    if(q.challengeContractVersion!==1||q.interactionSpec?.schemaVersion!==1||q.interactionSpec.kind!==kind)fail('invalid-contract','未知的完整包版本。');
    if(q.station==='A' && (!q.decompositionSpec||!equivalent(evaluateAst(parse(q.source)),evaluateAst(parse(`sqrt(${q.decompositionSpec.radicand})`)))))fail('invalid-contract','分解步驟來源與原題不符。');
    if(q.station==='C' && (!q.stepSpec||canonical(parse(q.source))!==canonical(parse(`(${q.stepSpec.numerator})/(${q.stepSpec.denominator})`))))fail('invalid-contract','有理化步驟來源與原題不符。');
  }
  const event={id:eventId,type:'start-challenge',roundId,at};
  return {schemaVersion:1,eventVersion:1,roundId,unitId:'simplification',mode:'challenge',status:'in-progress',phase:'answering',
    questions:qs,index:0,responses:{},drafts:{},events:[event],startedAt:at,completedAt:null,pendingAbandonRequestId:null,settlement:null};
}

/** Immutable reducer. Only this module creates grade evidence, always from original questions. */
export function applyChallengeEvent(current,input) {
  const event=json(input,24000); id(event.id);id(event.roundId);time(event.at);
  if(current.schemaVersion!==1||current.eventVersion!==1||event.roundId!==current.roundId)fail('invalid-contract','回合或事件版本不符。');
  const old=current.events.find(e=>e.id===event.id);
  if(old) {if(canonical(old)!==canonical(event))fail('event-conflict','同事件ID內容不一致。');return current;}
  if(current.events.length>=2000)fail('resource-limit','回合事件數超過限制。');
  if(Date.parse(event.at)<Date.parse(current.events.at(-1).at))fail('invalid-contract','事件時間不可倒退。');
  if(['completed','abandoned'].includes(current.status))fail('invalid-state','已結算回合只能回顧。');
  const s=json(current), active=s.status==='in-progress';
  const question=()=>{const q=s.questions.find(q=>q.id===event.questionId);if(!q)fail('invalid-contract','找不到題目。');return q;};
  const working=()=>{if(!active||s.pendingAbandonRequestId)fail('invalid-state','暫停或放棄確認中不能操作。');};
  const record=q=>(s.responses[q.id] ||= {first:null,latest:null,submissions:[],edits:[],hints:[],solutionViews:[]});
  if(event.type==='pause') {
    if(!active||!['home','interruption','manual'].includes(event.reason))fail('invalid-state','暫停事件無效。');s.status='paused';
  } else if(event.type==='resume') {
    if(active)fail('invalid-state','回合尚未暫停。');s.status='in-progress';
  } else if(event.type==='request-abandon') {
    if(s.pendingAbandonRequestId)fail('invalid-state','已有待確認放棄要求。');s.pendingAbandonRequestId=event.id;
  } else if(event.type==='cancel-abandon'||event.type==='confirm-abandon') {
    if(!s.pendingAbandonRequestId||event.requestId!==s.pendingAbandonRequestId)fail('invalid-state','放棄確認要求不符。');
    if(event.type==='confirm-abandon') {
      if(event.confirmed!==true)fail('invalid-state','必須明確確認放棄。');
      for(const q of s.questions){const r=record(q);if(!r.first)r.first=r.latest={kind:'skipped',accepted:false,eventId:event.id,reason:'confirmed-abandon'};}
      s.abandonRequestId=event.requestId;s.status='abandoned';s.completedAt=event.at;
      s.settlement={type:event.type,eventId:event.id,confirmed:true,requestId:event.requestId};
    }
    s.pendingAbandonRequestId=null;
  } else if(event.type==='finish-challenge') {
    working();if(!challengeSummary(s).canFinish||event.confirmed!==true)fail('invalid-state','須完成14題首次結果並明確確認結算。');
    s.status='completed';s.completedAt=event.at;s.settlement={type:event.type,eventId:event.id,confirmed:true};
  } else if(event.type==='next-question'||event.type==='go-question') {
    working();const index=event.type==='next-question'?s.index+1:event.index;
    if(!Number.isInteger(index)||index<0||index>=s.questions.length)fail('invalid-state','題號超出範圍。');s.index=index;
  } else if(['challenge-edit','challenge-submit','challenge-correct','challenge-step','skip','hint','challenge-view-solution'].includes(event.type)) {
    working();const q=question(),r=record(q);
    if(event.type==='challenge-edit') {
      if(r.first?.kind==='skipped')fail('invalid-state','跳題後不能再作答。');
      const draft=responseFor(q,event.response);s.drafts[q.id]=draft;
      r.edits.push({eventId:event.id,at:event.at,response:draft}); // No parse/evaluate/subresult here.
    } else if(event.type==='hint'||event.type==='challenge-view-solution') {
      if(!r.first)fail('invalid-state','首次提交前不提供數學提示或完整解答。');
      if(event.type==='challenge-view-solution') {
        if(event.confirmed!==true)fail('invalid-state','查看解答須明確確認。');r.solutionViews.push({eventId:event.id,at:event.at,steps:clone(q.solutionSteps)});
      } else {
        if(![1,2].includes(event.level))fail('invalid-contract','完整解答須以查看解答事件記錄。');
        const hint=planHint(q,q.conceptTags[0],event.level);r.hints.push({eventId:event.id,at:event.at,...hint});
      }
    } else if(event.type==='skip') {
      if(r.first||event.confirmed!==true)fail('invalid-state','跳題須確認且尚未有首次結果。');
      r.first=r.latest={kind:'skipped',accepted:false,eventId:event.id,reason:'explicit-skip'};
    } else {
      if(r.first?.kind==='skipped')fail('invalid-state','已跳題不可再提交。');
      if(['challenge-correct','challenge-step'].includes(event.type)&&!r.first)fail('invalid-state','首次前不可使用訂正事件。');
      const response=responseFor(q,event.response||s.drafts[q.id]||{});
      const result=isDirectQuestion(q)?evaluateDirectAnswer(q,response):evaluateChallengeBundle(q,response);
      const submission={kind:'submitted',eventId:event.id,at:event.at,response,result,accepted:result.accepted};
      r.submissions.push(submission);s.drafts[q.id]=response;
      if(result.consumesFirst){if(!r.first)r.first=clone(submission);r.latest=clone(submission);}
    }
  } else fail('invalid-contract','未知的挑戰事件。');
  s.events.push(event);s.phase=challengeSummary(s).phase;return s;
}

/** Versioned in-memory replay data for B3, no storage APIs or repository. */
export function challengeReplayData(state) {
  return json({schemaVersion:1,eventVersion:1,header:{roundId:state.roundId,questions:state.questions},events:state.events});
}
export function replayChallenge(data) {
  const d=json(data);
  if(d.schemaVersion!==1||d.eventVersion!==1||!d.header||!Array.isArray(d.events)||!d.events.length||d.events.length>2000)fail('invalid-contract','未知或無效的挑戰回放版本。');
  const first=d.events[0];
  if(first.type!=='start-challenge'||first.roundId!==d.header.roundId)fail('invalid-contract','缺少開始事件。');
  let s=startChallenge({roundId:first.roundId,questions:d.header.questions,at:first.at,eventId:first.id,entry:{schemaVersion:1,integrity:'verified',rounds:[]}});
  if(canonical(first)!==canonical(s.events[0]))fail('invalid-contract','開始事件含非契約欄位。');
  for(const event of d.events.slice(1))s=applyChallengeEvent(s,event);
  return s;
}
