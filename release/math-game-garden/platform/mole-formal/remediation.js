// Independent versioned envelope; never imports ordinary WP03 results as grants.
import {generateQuestions} from '../src/questions/generator.js';
import {createAttempt,applyAttemptEvent,practiceResolvedCount} from '../src/learning/attempt.js';
import {summary as challengeSummary} from './state.js';
export const EXTRA='mole-simplification-remediation-authority-v1',POLICY='mole15-remediation10-first8-v1';
export const empty=()=>({schemaVersion:1,contractVersion:EXTRA,revision:0,events:[],attempts:[],grants:[]});
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(v,code)=>{if(!v)throw Error(code);};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!['__proto__','constructor','prototype'].includes(x);
export const blank=()=>({answer:'',judgment:null,correction:'',numeratorMultiplier:'',denominatorMultiplier:'',transformedNumerator:'',transformedDenominator:'',dirty:false});
export function failedSource(ledger,sourceId){const r=ledger.rounds.find(r=>r.id===sourceId);need(r?.phase==='settled'&&r.settlement?.needsRemediation===true&&challengeSummary(r).firstCount===15&&challengeSummary(r).firstCorrect<12,'invalid-remediation-source');return r;}
export const availableGrant=(a,source)=>a.grants.find(g=>g.sourceRoundId===source&&g.usedByRoundId===null)||null;
export function summary(a){const rs=Object.values(a.attempt.responses),count=rs.filter(r=>r.first).length,firstCorrect=rs.filter(r=>r.first?.accepted).length;return {count,firstCorrect,resolved:practiceResolvedCount(a.attempt),rate:count===10?firstCorrect*10:null,status:a.status==='completed'?(firstCorrect>=8?'passed':'not-met'):'incomplete'};}
export function stateOf(a){return structuredClone({attempt:a.attempt,index:a.index,drafts:a.drafts,showResults:a.showResults,resolvedCount:practiceResolvedCount(a.attempt)});}
export function reduceLearning(current,event,ledger){
 need(event&&id(event.id)&&Number.isFinite(Date.parse(event.at)),'invalid-remediation-event');
 const prior=current.events.find(e=>e.id===event.id);if(prior){need(equal(prior,event),'remediation-event-conflict');return structuredClone(current);}
 const a=structuredClone(current);
 if(event.type==='begin-remediation'){
  need(id(event.attemptId)&&id(event.remediationId)&&typeof event.seed==='string'&&event.seed.length>0&&event.seed.length<=100,'invalid-remediation-start');
  failedSource(ledger,event.sourceRoundId);need(ledger.rounds.at(-1)?.id===event.sourceRoundId,'source-not-current');
  need(!a.attempts.some(x=>x.status!=='completed'),'resume-existing-remediation');
  need(!a.attempts.some(x=>x.attemptId===event.attemptId||x.remediationId===event.remediationId),'duplicate-remediation-attempt');need(!availableGrant(a,event.sourceRoundId),'unlock-already-issued');
  const questions=generateQuestions({unitId:'simplification',mode:'practice',count:10,seed:event.seed});
  // Reuse practice pedagogy for corrections and explicit solutions. Only this
  // outer, source-bound, replay-verified envelope can issue a qualification.
  const attempt=createAttempt({id:event.attemptId,mode:'practice',questions,startedAt:event.at});
  a.attempts.push({contractVersion:'mole-remediation-practice-v1',unitId:'simplification',mode:'remediation',policyVersion:POLICY,remediationId:event.remediationId,attemptId:event.attemptId,sourceRoundId:event.sourceRoundId,seed:event.seed,startedAt:event.at,status:'in-progress',completedAt:null,index:0,showResults:false,drafts:questions.map(blank),attempt,unlockId:null});
 }else if(event.type==='consume-unlock'){
  const g=a.grants.find(x=>x.unlockId===event.unlockId);need(g&&g.sourceRoundId===event.sourceRoundId&&g.usedByRoundId===null,'invalid-or-used-unlock');failedSource(ledger,event.sourceRoundId);
  need(ledger.rounds.at(-1)?.id===event.sourceRoundId&&id(event.newRoundId)&&!ledger.rounds.some(r=>r.id===event.newRoundId),'invalid-unlock-target');g.usedByRoundId=event.newRoundId;g.usedAt=event.at;
 }else{
  const t=a.attempts.find(x=>x.attemptId===event.attemptId);need(t,'unknown-remediation');need(t.status!=='completed','remediation-read-only');need(ledger.rounds.at(-1)?.id===t.sourceRoundId,'source-not-current');
  if(event.type==='draft'){
   need(t.attempt.status==='in-progress'&&id(event.questionId),'invalid-draft');const i=t.attempt.questions.findIndex(q=>q.id===event.questionId);need(i>=0,'unknown-question');need(Object.hasOwn(t.drafts[i],event.field)&&event.field!=='dirty'&&(event.field==='judgment'?[true,false,null].includes(event.value):typeof event.value==='string'&&event.value.length<=256),'invalid-draft');t.drafts[i][event.field]=event.value;
  }else if(event.type==='navigate'){need(Number.isInteger(event.index)&&event.index>=0&&event.index<10,'invalid-practice-index');t.index=event.index;t.showResults=false;
  }else if(event.type==='finish-remediation'){
   const s=summary(t);need(s.count===10&&s.resolved===10&&t.attempt.status==='completed','remediation-not-complete');failedSource(ledger,t.sourceRoundId);t.status='completed';t.completedAt=event.at;t.showResults=true;
   if(s.firstCorrect>=8){need(!a.grants.some(g=>g.attemptId===t.attemptId)&&!availableGrant(a,t.sourceRoundId),'unlock-already-issued');t.unlockId='mole-unlock:'+t.attemptId;a.grants.push({unlockId:t.unlockId,sourceRoundId:t.sourceRoundId,remediationId:t.remediationId,attemptId:t.attemptId,policyVersion:POLICY,issuedAt:event.at,usedByRoundId:null,usedAt:null});}
  }else{
   need(['submit','hint','view-solution','practice-step','pause','resume'].includes(event.type),'unknown-remediation-event');const payload={...event};delete payload.attemptId;
   if(event.type==='submit'){const q=t.attempt.questions[t.index];need(q.id===event.questionId,'not-current-question');const d=t.drafts[t.index];payload.response=q.station==='B'?{isSimplest:d.judgment,...(d.judgment===false?{correctedAnswer:d.correction}:{})}:{answer:d.answer};need(event.response===undefined,'response-must-use-confirmed-draft');}
   if(event.type==='hint')need([1,2].includes(event.level),'hint-level-not-supported');if(event.type==='pause')payload.reason='manual';
   if(event.type==='practice-step'){const d=t.drafts[t.index];payload.response={numeratorMultiplier:d.numeratorMultiplier,denominatorMultiplier:d.denominatorMultiplier,transformedNumerator:d.transformedNumerator,transformedDenominator:d.transformedDenominator};}
   t.attempt=applyAttemptEvent(t.attempt,payload);
   if(event.type==='submit'){
    const r=t.attempt.responses[event.questionId],last=r?.submissions.at(-1);
    if(last?.result.consumesFirst&&!last.accepted&&!r.hints?.some(h=>h.level===1))t.attempt=applyAttemptEvent(t.attempt,{id:event.id+':feedback',type:'hint',at:event.at,questionId:event.questionId,level:1,source:'feedback',conceptId:last.diagnosis?.[0]?.conceptId});
   }
  }
 }
 a.events.push(structuredClone(event));a.revision++;return a;
}
export function decodeLearning(raw,ledger){if(raw===null)return empty();const stored=JSON.parse(raw);need(stored?.schemaVersion===1&&stored.contractVersion===EXTRA&&Array.isArray(stored.events)&&stored.events.length<=10000,'unsupported-mole-remediation');let replay=empty();
 for(const e of stored.events){let context=ledger;const source=e.sourceRoundId||replay.attempts.find(a=>a.attemptId===e.attemptId)?.sourceRoundId;if(source){const i=ledger.rounds.findIndex(r=>r.id===source);need(i>=0,'invalid-remediation-source');context={...ledger,rounds:ledger.rounds.slice(0,i+1)};}replay=reduceLearning(replay,e,context);}
 need(equal(stored,replay),'remediation-event-snapshot-mismatch');for(const g of stored.grants)if(g.usedByRoundId){const i=ledger.rounds.findIndex(r=>r.id===g.sourceRoundId);need(ledger.rounds[i+1]?.id===g.usedByRoundId,'unlock-round-link-mismatch');}return stored;
}
