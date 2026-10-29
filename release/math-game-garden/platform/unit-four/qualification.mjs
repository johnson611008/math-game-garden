import{summary}from'./learning.mjs';import{grade,equal}from'../crystal-cart-formal/state.mjs';
export const QUALIFICATION_EXTRA='unit-four-rechallenge-authority-v1',QUALIFICATION_POLICY='unit-four-rechallenge-first8-once-v1';
const need=(v,c)=>{if(!v)throw Error(c);},id=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!['__proto__','prototype','constructor'].includes(v);
export const emptyQualifications=()=>({schemaVersion:1,policyVersion:QUALIFICATION_POLICY,revision:0,events:[],grants:[]});
export const qualificationId=attemptId=>'u4-retry:'+attemptId;
export function eligibleAttempt(learning,sourceRoundId){return learning.attempts.find(a=>a.sourceRoundId===sourceRoundId&&a.status==='completed'&&summary(a).count===10&&summary(a).resolved===10&&summary(a).firstCorrect>=8)||null;}
export const availableQualification=(q,sourceRoundId)=>q.grants.find(g=>g.sourceRoundId===sourceRoundId&&g.usedByRoundId===null)||null;
export const claimRequest=(attempt)=>({id:'issue:'+attempt.attemptId,type:'issue',sourceRoundId:attempt.sourceRoundId,attemptId:attempt.attemptId});
export function reduceQualifications(authority,event,doc,learning){
 need(event&&id(event.id)&&Number.isSafeInteger(event.atMs)&&event.atMs>=0&&id(event.sourceRoundId),'invalid-qualification-event');const old=authority.events.find(e=>e.id===event.id);if(old){need(equal(old,event),'qualification-event-conflict');return structuredClone(authority);}need(!authority.events.length||event.atMs>=authority.events.at(-1).atMs,'qualification-clock-rollback');
 const next=structuredClone(authority),source=doc.rounds.find(r=>r.roundId===event.sourceRoundId);need(source?.phase==='settled'&&grade(source).status==='not-met','invalid-qualification-source');
 if(event.type==='issue'){
  const a=learning.attempts.find(a=>a.attemptId===event.attemptId);need(a&&a.sourceRoundId===source.roundId&&eligibleAttempt({attempts:[a]},source.roundId),'remediation-not-passed');need(event.atMs>=a.completedAtMs,'qualification-before-remediation');need(!next.grants.some(g=>g.attemptId===a.attemptId||g.sourceRoundId===source.roundId),'qualification-already-issued');
  next.grants.push({qualificationId:qualificationId(a.attemptId),policyVersion:QUALIFICATION_POLICY,sourceRoundId:source.roundId,remediationId:a.remediationId,attemptId:a.attemptId,issuedEventId:event.id,issuedAtMs:event.atMs,usedByRoundId:null,usedAtMs:null,consumedEventId:null});
 }else if(event.type==='consume'){
  const g=next.grants.find(g=>g.qualificationId===event.qualificationId);need(g&&g.sourceRoundId===source.roundId&&g.usedByRoundId===null,'invalid-or-used-qualification');need(id(event.newRoundId)&&event.atMs>=g.issuedAtMs,'invalid-qualification-consumption');const i=doc.rounds.findIndex(r=>r.roundId===source.roundId),round=doc.rounds[i+1];need(round?.roundId===event.newRoundId&&round.startedAtMs===event.atMs,'qualification-round-atomicity');
  g.usedByRoundId=round.roundId;g.usedAtMs=event.atMs;g.consumedEventId=event.id;
 }else throw Error('unknown-qualification-event');
 next.events.push(structuredClone(event));next.revision++;return next;
}
export function validateQualificationLinks(q,doc){for(let i=1;i<doc.rounds.length;i++){const prior=doc.rounds[i-1],round=doc.rounds[i];need(prior.phase==='settled','round-history-not-settled');if(grade(prior).status==='not-met')need(q.grants.filter(g=>g.sourceRoundId===prior.roundId&&g.usedByRoundId===round.roundId).length===1,'missing-consumed-qualification');}}
export function decodeQualifications(raw,doc,learning){let result=emptyQualifications();if(raw!==null){const x=JSON.parse(raw);need(x.schemaVersion===1&&x.policyVersion===QUALIFICATION_POLICY&&Array.isArray(x.events)&&x.events.length<=10000,'unsupported-unit-four-qualifications');for(const e of x.events)result=reduceQualifications(result,e,doc,learning);need(equal(result,x),'qualification-event-snapshot-mismatch');}validateQualificationLinks(result,doc);return result;}
