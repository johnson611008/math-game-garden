import {BANK,shuffled,judge} from '../bubble-formal/questions.js';
import {rng} from '../bubble-demo/engine.js';
import {parse} from '../src/input/parser.js';
import {evaluateAst} from '../src/math/operations.js';
import {serialize} from '../src/math/radical-value.js';
import {evaluateExpression} from '../src/assessment/evaluator.js';
import {grade,equal} from '../bubble-formal/state.js';

export const POLICY='unit-three-remediation-10-first-8-v1';
export const EXTRA='unit-three-learning-authority-v1';
const need=(value,code)=>{if(!value)throw Error(code);};
const identifier=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!['__proto__','prototype','constructor'].includes(x);
export const empty=()=>({schemaVersion:1,revision:0,events:[],attempts:[],grants:[]});
export function plan(seed){const random=rng(seed),qs=[];for(let stage=1;stage<=5;stage++)qs.push(...shuffled(BANK.filter(q=>q.stage===stage),random).slice(0,2));return qs.map(q=>({...q,expectedValue:q.expected}));}
export function summary(a){const records=Object.values(a.responses),count=records.filter(r=>r.first).length,firstCorrect=records.filter(r=>r.first?.result.accepted).length,resolved=records.filter(r=>r.latest?.result.accepted).length;return {count,firstCorrect,resolved,rate:count===10?firstCorrect*10:null,status:a.status==='completed'?(firstCorrect>=8?'passed':'not-met'):'incomplete',wrongConcepts:[...new Set(records.filter(r=>r.first&&!r.first.result.accepted).flatMap(r=>r.first.concepts))]};}
export function concepts(q,result){if(result.accepted)return [];if(result.equivalent)return ['SIMPLIFY_BEFORE_COMBINING'];return [...new Set([q.concept,...result.reasonCodes])];}

export function hintText(q,level=1){return level===1?'先看根號內是否相同；不同時，試著找完全平方因數。':'同類根式只合併係數，注意減號；最後檢查根號內還能不能化簡。';}
function failedSource(ledger,id){const source=ledger.rounds.find(r=>r.roundId===id);need(source?.phase==='settled'&&grade(source).status==='not-met','invalid-remediation-source');return source;}
export function availableGrant(authority,sourceRoundId){return authority.grants.find(g=>g.sourceRoundId===sourceRoundId&&g.usedByRoundId===null)||null;}
export function reduceLearning(authority,event,ledger){
 need(event&&identifier(event.id)&&Number.isFinite(Date.parse(event.at)),'invalid-learning-event');
 const old=authority.events.find(e=>e.id===event.id);if(old){need(equal(old,event),'learning-event-conflict');return structuredClone(authority);}
 const next=structuredClone(authority);
 if(event.type==='begin-practice'){
  need(identifier(event.attemptId)&&Number.isInteger(event.seed)&&event.seed>=0&&event.seed<=4294967295&&['practice','remediation'].includes(event.mode),'invalid-practice-start');
  need(!next.attempts.some(a=>a.attemptId===event.attemptId),'duplicate-practice-attempt');
  need(!next.attempts.some(a=>a.mode===event.mode&&a.status!=='completed'),'resume-existing-practice');
  if(event.mode==='remediation'){
   need(identifier(event.remediationId),'invalid-remediation-id');failedSource(ledger,event.sourceRoundId);
   need(ledger.rounds.at(-1)?.roundId===event.sourceRoundId,'source-not-current');
   need(!availableGrant(next,event.sourceRoundId),'unlock-already-issued');
   need(!next.attempts.some(a=>a.remediationId===event.remediationId),'duplicate-remediation-id');
  }else need(event.sourceRoundId==null&&event.remediationId==null,'practice-cannot-request-unlock');
  next.attempts.push({contractVersion:'unit-three-practice-v1',unitId:'addition-subtraction',policyVersion:POLICY,mode:event.mode,attemptId:event.attemptId,remediationId:event.mode==='remediation'?event.remediationId:null,sourceRoundId:event.mode==='remediation'?event.sourceRoundId:null,seed:event.seed,startedAt:event.at,status:'in-progress',completedAt:null,index:0,questions:plan(event.seed),responses:{},drafts:{},unlockId:null,events:[]});
 }else if(event.type==='consume-unlock'){
  const grant=next.grants.find(g=>g.unlockId===event.unlockId);need(grant&&grant.sourceRoundId===event.sourceRoundId&&grant.usedByRoundId===null,'invalid-or-used-unlock');
  failedSource(ledger,event.sourceRoundId);need(identifier(event.newRoundId),'invalid-new-round');
  grant.usedByRoundId=event.newRoundId;grant.usedAt=event.at;
 }else{
  const a=next.attempts.find(a=>a.attemptId===event.attemptId);need(a,'unknown-practice');need(a.status!=='completed','practice-read-only');
  const q=a.questions.find(q=>q.id===event.questionId);
  if(['submit','hint','draft'].includes(event.type))need(q,'unknown-practice-question');
  if(event.type==='submit'){
   need(a.status==='in-progress'&&typeof event.answer==='string'&&event.answer.length<=256,'invalid-practice-answer');
   const result=judge(q,event.answer);
   const record=a.responses[q.id]??={first:null,latest:null,submissions:[],hints:[]};
   const submission={eventId:event.id,at:event.at,answer:event.answer,result,concepts:concepts(q,result)};record.submissions.push(submission);
   if(result.consumesFirst){record.first??=structuredClone(submission);record.latest=structuredClone(submission);}
   a.drafts[q.id]=event.answer;
  }else if(event.type==='hint'){
   const record=a.responses[q.id]??={first:null,latest:null,submissions:[],hints:[]};
   need([1,2].includes(event.level),'invalid-hint-level');record.hints.push({eventId:event.id,at:event.at,level:event.level});
  }else if(event.type==='draft'){
   need(typeof event.answer==='string'&&event.answer.length<=256,'invalid-draft');a.drafts[q.id]=event.answer;
  }else if(event.type==='navigate'){
   need(Number.isInteger(event.index)&&event.index>=0&&event.index<10,'invalid-practice-index');a.index=event.index;
  }else if(event.type==='pause')a.status='paused';
  else if(event.type==='resume')a.status='in-progress';
  else if(event.type==='finish-practice'){
   need(summary(a).count===10&&summary(a).resolved===10,'practice-not-complete');a.status='completed';a.completedAt=event.at;
   if(a.mode==='remediation'){
    failedSource(ledger,a.sourceRoundId);need(ledger.rounds.at(-1)?.roundId===a.sourceRoundId,'source-not-current');
    if(summary(a).status==='passed'){
     need(!next.grants.some(g=>g.attemptId===a.attemptId)&&!availableGrant(next,a.sourceRoundId),'unlock-already-issued');
     a.unlockId='unlock:'+a.attemptId;next.grants.push({unlockId:a.unlockId,remediationId:a.remediationId,attemptId:a.attemptId,sourceRoundId:a.sourceRoundId,policyVersion:POLICY,issuedAt:event.at,usedByRoundId:null,usedAt:null});
    }
   }
  }else throw Error('unknown-learning-event');
  a.events.push(structuredClone(event));
 }
 next.events.push(structuredClone(event));next.revision++;return next;
}
export function decodeLearning(raw,ledger){
 if(raw===null)return empty();const a=JSON.parse(raw);need(a?.schemaVersion===1&&Array.isArray(a.events)&&a.events.length<=10000,'unsupported-learning-authority');
 let replay=empty();for(const e of a.events){
  // Historical source-current checks are evaluated against the prefix in which the event happened.
  let context=ledger;if(e.type==='begin-practice'&&e.mode==='remediation'||e.type==='finish-practice'){
   const source=e.sourceRoundId||replay.attempts.find(a=>a.attemptId===e.attemptId)?.sourceRoundId;
   if(source){const index=ledger.rounds.findIndex(r=>r.roundId===source);context={...ledger,rounds:ledger.rounds.slice(0,index+1)};}
  }
  replay=reduceLearning(replay,e,context);
 }
 need(equal(replay,a),'learning-event-snapshot-mismatch');
 for(const g of a.grants){if(g.usedByRoundId){const i=ledger.rounds.findIndex(r=>r.roundId===g.sourceRoundId);need(ledger.rounds[i+1]?.roundId===g.usedByRoundId,'unlock-round-link-mismatch');}}
 return a;
}
