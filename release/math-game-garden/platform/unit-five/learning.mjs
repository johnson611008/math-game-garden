import {BANK_VERSION,plan,judgeAnswer} from './bank.mjs';
import {grade,equal} from '../rescue-battle-formal/state.mjs';
export const EXTRA='unit-five-remediation-authority-v1';
export const POLICY='unit-five-formulas-10-first-8-no-grant-v1';
const need=(x,c)=>{if(!x)throw Error(c);},id=x=>typeof x==='string'&&x.length>0&&x.length<=160&&!['__proto__','constructor','prototype'].includes(x);
export const empty=()=>({schemaVersion:1,policyVersion:POLICY,revision:0,events:[],attempts:[]});
export function summary(a){const rs=Object.values(a.responses),count=rs.filter(r=>r.first).length,firstCorrect=rs.filter(r=>r.first?.result.accepted).length,resolved=rs.filter(r=>r.latest?.result.accepted).length;return {count,firstCorrect,resolved,status:a.status==='completed'?(firstCorrect>=8?'passed':'not-met'):'incomplete'};}
function sourceOf(doc,sourceId){const s=doc.rounds.find(r=>r.roundId===sourceId);need(s?.phase==='settled'&&s.settlement?.status==='not-met'&&grade(s).status==='not-met'&&doc.active===sourceId,'invalid-remediation-source');return s;}
export function reduce(authority,event,doc){
 need(event&&id(event.id)&&Number.isSafeInteger(event.atMs)&&event.atMs>=0,'invalid-learning-event');
 const old=authority.events.find(e=>e.id===event.id);if(old){need(equal(old,event),'learning-event-conflict');return structuredClone(authority);}
 need(!authority.events.length||event.atMs>=authority.events.at(-1).atMs,'learning-clock-rollback');
 const base={id:event.id,type:event.type,sourceRoundId:event.sourceRoundId,attemptId:event.attemptId,atMs:event.atMs},next=structuredClone(authority);
 need(id(event.attemptId)&&id(event.sourceRoundId),'invalid-remediation-id');
 if(event.type==='begin'){
  need(equal(event,{...base,remediationId:event.remediationId,seed:event.seed})&&id(event.remediationId),'invalid-begin-fields');
  const source=sourceOf(doc,event.sourceRoundId);need(event.atMs>=source.settlement.atMs,'learning-clock-rollback');
  need(!next.attempts.some(a=>a.attemptId===event.attemptId||a.remediationId===event.remediationId),'duplicate-remediation');
  const prior=next.attempts.filter(a=>a.sourceRoundId===event.sourceRoundId);
  need(!prior.some(a=>a.status!=='completed'),'resume-existing-remediation');
  need(!prior.some(a=>summary(a).status==='passed'),'remediation-passed-awaiting-qualification');
  next.attempts.push({contractVersion:'unit-five-remediation-attempt-v1',policyVersion:POLICY,bankVersion:BANK_VERSION,unitId:'radical-formulas',sourceRoundId:event.sourceRoundId,remediationId:event.remediationId,attemptId:event.attemptId,seed:event.seed,startedAtMs:event.atMs,completedAtMs:null,status:'in-progress',index:0,questions:plan(event.seed,source,prior),responses:{},events:[]});
 }else{
  const a=next.attempts.find(a=>a.attemptId===event.attemptId);need(a,'unknown-remediation');sourceOf(doc,a.sourceRoundId);need(event.sourceRoundId===a.sourceRoundId,'remediation-source-mismatch');need(a.status!=='completed','remediation-read-only');const q=a.questions[a.index];
  if(['submit','hint'].includes(event.type)){
   need(event.questionId===q.id,'question-not-current');need(equal(event,{...base,questionId:event.questionId,...(event.type==='submit'?{answer:event.answer}:{})}),'invalid-learning-fields');
   const r=a.responses[q.id]||={first:null,latest:null,submissions:[],hints:[]};need(!r.latest?.result.accepted,'question-already-completed');
   if(event.type==='hint')r.hints.push({eventId:event.id,atMs:event.atMs});
   else{need(typeof event.answer==='string'&&event.answer.length>0&&event.answer.length<=256&&event.answer===event.answer.trim(),'invalid-remediation-answer');const result=judgeAnswer(q,event.answer),entry={eventId:event.id,answer:event.answer,result,outcome:result.consumesFirst?(result.accepted?'correct':'wrong'):'invalid',atMs:event.atMs,kind:r.first?'correction':'first'};r.submissions.push(entry);r.latest=entry;if(result.consumesFirst&&!r.first)r.first=entry;}
  }else if(event.type==='next'){need(equal(event,base),'invalid-learning-fields');need(a.responses[q.id]?.latest?.result.accepted&&a.index<9,'question-not-completed');a.index++;}
  else if(event.type==='finish'){need(equal(event,base),'invalid-learning-fields');need(a.index===9&&summary(a).count===10&&summary(a).resolved===10,'remediation-incomplete');a.status='completed';a.completedAtMs=event.atMs;}
  else throw Error('unknown-learning-event');a.events.push(event.id);
 }
 next.events.push(structuredClone(event));next.revision++;return next;
}
export function decodeLearning(raw,doc){if(raw===null)return empty();const x=JSON.parse(raw);need(x?.schemaVersion===1&&x.policyVersion===POLICY&&Array.isArray(x.events)&&x.events.length<=10000,'unsupported-unit-five-remediation');let r=empty();for(const e of x.events){const i=doc.rounds.findIndex(s=>s.roundId===e.sourceRoundId);need(i>=0,'unknown-remediation-history-source');r=reduce(r,e,{...doc,active:e.sourceRoundId,rounds:doc.rounds.slice(0,i+1)});}need(equal(r,x),'remediation-event-snapshot-mismatch');return x;}
export function entry(authority,round){if(!round||round.phase!=='settled'||round.settlement?.status!=='not-met')return null;const a=authority.attempts.filter(a=>a.sourceRoundId===round.roundId).at(-1);if(!a)return {label:'前往補救練功區',message:'需要完成根式乘法公式指定補救',progress:0};const s=summary(a);return a.status!=='completed'?{label:'繼續補救',message:'你還有補救練功尚未完成',progress:s.resolved}:s.status==='not-met'?{label:'重新練功',message:'本次練功未達標，正式挑戰仍鎖定',progress:10}:{label:'查看練功成果',message:'練功達標，等待重新挑戰資格',progress:10};}
