// Fifth-unit adapter. The original math and battle reducers remain authoritative
// for grading/HP; durable snapshots never depend on an animation callback.
import {QUESTIONS,validateBank} from '../rescue-battle-demo/questions.mjs';
import {createBattle,transition,submit,resolve,finishAttack,score} from '../rescue-battle-demo/battle.mjs';
export const POLICY='rescue-ten-first-7-v1';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const time=x=>Number.isSafeInteger(x)&&x>=0;
function check(ok,code){if(!ok)throw Error(code);}
export function grade(r){const s=score(r.battle);return {...s,status:s.firstCount!==10||s.completed!==10?'incomplete':s.heroHP>=7?'passed':'not-met'};}
export function startRound(roundId,atMs){
 check(id(roundId)&&time(atMs),'invalid-start');validateBank();
 return {schemaVersion:1,policyVersion:POLICY,roundId,startedAtMs:atMs,questions:structuredClone(QUESTIONS),phase:'active',battle:transition(transition(createBattle(),'assets-ready'),'start'),events:[],settlement:null};
}
export function apply(r,event){
 check(r.phase!=='settled','settled-read-only');
 check(event&&id(event.id)&&event.roundId===r.roundId&&time(event.atMs),'invalid-event');
 check(event.atMs>=(r.events.at(-1)?.atMs??r.startedAtMs),'clock-rollback');
 check(!r.events.some(e=>e.id===event.id),'duplicate-event');
 const base={id:event.id,roundId:event.roundId,type:event.type,atMs:event.atMs};
 const next=structuredClone(r);let b=next.battle;
 if(event.type==='answer'){
  check(equal(event,{...base,questionId:event.questionId,answer:event.answer}),'unsupported-answer-fields');
  check(r.phase==='active'&&event.questionId===QUESTIONS[b.index].id,'wrong-question-or-phase');
  check(typeof event.answer==='string'&&event.answer.length<=256&&event.answer===event.answer.trim(),'invalid-answer');
  const pending=submit(b,event.answer);check(pending!==b,'answer-locked');
  let result=resolve(pending,pending.pending.token);
  check(result.records[b.index].attempts.length===b.records[b.index].attempts.length+1,'answer-not-recordable');
  // An acknowledged first answer has already caused exactly one HP change.
  // Save the stable post-animation state, so F5 never needs an attack replay.
  if(result.animation)result=finishAttack(result,result.animation.token);
  next.battle=result;
 }else if(event.type==='next'){
  check(equal(event,base),'unsupported-event-fields');
  check(r.phase==='active'&&b.phase==='battle'&&b.records[b.index]?.completed,'next-locked');
  if(b.index===9){check(grade(r).status!=='incomplete','ten-results-required');next.phase='awaiting-settlement';}
  else next.battle=transition(b,'next');
 }else if(event.type==='settle'){
  check(equal(event,base),'unsupported-event-fields');
  check(r.phase==='awaiting-settlement'&&grade(r).status!=='incomplete','not-ready-to-settle');
  const g=grade(r);check(b.heroHP===10-(10-g.firstCorrect)&&b.bossHP===10-g.firstCorrect,'hp-result-mismatch');
  next.battle=transition(b,'next');next.phase='settled';
  next.settlement={atMs:event.atMs,status:g.status,firstCorrect:g.firstCorrect,heroHP:b.heroHP,bossHP:b.bossHP};
 }else throw Error('unsupported-event');
 next.events.push(structuredClone(event));return next;
}
export function validateRound(raw){
 check(raw&&Array.isArray(raw.events)&&raw.events.length<=2000,'invalid-round');
 let expected=startRound(raw.roundId,raw.startedAtMs);
 for(const e of raw.events)expected=apply(expected,e);
 check(equal(raw,expected),'round-replay-mismatch');return raw;
}
