import*as legacy from './legacy-state-v1.mjs';
import{FeedbackCart}from'./feedback-world.mjs';
import{BANK_VERSION}from'./questions.mjs';import{FormalCart,makePlan,fitWorld,chargeClock,QUESTION_MS}from'./world.mjs';
export const VERSION='crystal-cart-ten-feedback-v2',CLOCK_POLICY='cart-30s-absence-counts-v1';
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(v,c)=>{if(!v)throw Error(c);};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!['__proto__','prototype','constructor'].includes(x);
const time=x=>Number.isSafeInteger(x)&&x>=0;
export const slotId=i=>'U4-Q'+String(i+1).padStart(2,'0');
export function grade(r){const first=Object.values(r.slots).filter(s=>s.first),firstCorrect=first.filter(s=>s.first.kind==='correct').length;return{count:first.length,firstCorrect,status:first.length<10?'incomplete':r.phase!=='settled'?'unsettled':firstCorrect>=8?'passed':'not-met',settled:r.phase==='settled'};}
function clock(questionId,atMs){return{policyVersion:CLOCK_POLICY,questionId,startedAtMs:atMs,deadlineAtMs:atMs+QUESTION_MS,lastObservedAtMs:atMs};}
export function startRound(roundId,seed,viewport,atMs){need(id(roundId)&&Number.isInteger(seed)&&seed>=0&&seed<=4294967295&&time(atMs),'invalid-start');const plan=makePlan(seed),w=new FeedbackCart(seed,plan);fitWorld(w,viewport);return{contractVersion:VERSION,bankVersion:BANK_VERSION,roundId,seed,startedAtMs:atMs,initialViewport:structuredClone(viewport),viewport:structuredClone(viewport),plan,phase:'active',slots:Object.fromEntries(plan.map((q,i)=>[slotId(i),{slotId:slotId(i),questionId:q.id,first:null}])),clock:clock(plan[0].id,atMs),world:w.snapshot(),events:[],settlement:null,needsRemediation:false};}
function capture(r,w,event){for(let i=0;i<w.records.length;i++){const first=w.records[i].first,slot=r.slots[slotId(i)];if(!first){need(!slot.first,'first-result-lost');continue;}const kind=first.kind==='timeout'?'timeout':first.correct?'correct':'wrong',answer=first.answer??null;if(slot.first)need(slot.first.kind===kind&&slot.first.answer===answer,'first-result-overwrite');else slot.first={kind,correct:kind==='correct',answer,eventId:event.id,confirmedAtMs:event.atMs};}}
export function apply(round,event){if(round.contractVersion===legacy.VERSION)return legacy.apply(round,event);need(event&&id(event.id)&&event.roundId===round.roundId&&time(event.atMs)&&event.request?.id===event.id&&event.request.roundId===round.roundId,'invalid-event');const old=round.events.find(e=>e.id===event.id);if(old){need(equal(old,event),'event-conflict');return structuredClone(round);}need(round.phase!=='settled','settled-read-only');const r=structuredClone(round),request=event.request;need(!Object.hasOwn(request,'checkpoint')&&!Object.hasOwn(request,'first')&&!Object.hasOwn(request,'snapshot'),'untrusted-checkpoint');
 if(request.type==='settle'){need(r.phase==='awaiting-settlement'&&grade(r).count===10,'not-ready-to-settle');need(event.atMs>=r.events.at(-1).atMs,'clock-rollback');r.phase='settled';const g=grade(r);r.settlement={atMs:event.atMs,status:g.status,firstCorrect:g.firstCorrect,total:10};r.needsRemediation=g.status==='not-met';}
 else{need(r.phase==='active'&&event.atMs>=r.clock.lastObservedAtMs,'clock-rollback-or-inactive');const w=FeedbackCart.restore(r.seed,r.plan,r.world);
  if(request.type==='advance'){
   need(Array.isArray(request.segments)&&request.segments.length<=256,'invalid-trace');let cursor=r.clock.lastObservedAtMs,total=0;
   for(const segment of request.segments){need(time(segment.startAtMs)&&segment.startAtMs>=cursor&&Number.isInteger(segment.ticks)&&segment.ticks>0&&segment.ticks<=3300&&[-1,0,1].includes(segment.direction),'invalid-physics-segment');const end=segment.startAtMs+segment.ticks*10;need(end<=event.atMs,'future-physics');total+=segment.ticks;need(total<=3300,'trace-capacity');chargeClock(w,r.clock.deadlineAtMs,segment.startAtMs);w.direction=segment.direction;for(let n=0;n<segment.ticks;n++)w.tick(10);cursor=end;}
   chargeClock(w,r.clock.deadlineAtMs,event.atMs,'deadline');w.direction=0;
  }else if(request.type==='recover'){w.interrupt();w.resumeAfterAbsence(event.atMs-r.clock.lastObservedAtMs);chargeClock(w,r.clock.deadlineAtMs,event.atMs);w.direction=0;}
  else if(request.type==='resize'){chargeClock(w,r.clock.deadlineAtMs,event.atMs);fitWorld(w,request.viewport);r.viewport=structuredClone(request.viewport);w.direction=0;}
  else if(request.type==='correction'){need(typeof request.answer==='string'&&request.answer.length<=256,'invalid-correction');w.correctAnswer(request.answer);}
  else if(request.type==='next'){need(['correct','timeout'].includes(w.phase),'question-not-complete');need(w.next(),'cannot-next');if(w.phase==='finished'){need(grade(r).count===10,'incomplete-first-results');r.phase='awaiting-settlement';r.clock=null;}else r.clock=clock(r.plan[w.index].id,event.atMs);fitWorld(w,r.viewport);}
  else throw Error('unknown-cart-event');
  capture(r,w,event);r.world=w.snapshot();if(r.clock)r.clock.lastObservedAtMs=event.atMs;
 }
 r.events.push(structuredClone(event));return r;
}
const cache=new Map();
export function validateRound(r){if(r?.contractVersion===legacy.VERSION)return legacy.validateRound(r);need(r?.contractVersion===VERSION&&r.bankVersion===BANK_VERSION&&Array.isArray(r.events)&&r.events.length<=10000,'unsupported-cart-round');const old=cache.get(r.roundId),prefix=old&&old.seed===r.seed&&old.startedAtMs===r.startedAtMs&&equal(old.initialViewport,r.initialViewport)&&old.events.length<=r.events.length&&equal(old.events,r.events.slice(0,old.events.length));let replay=prefix?structuredClone(old):startRound(r.roundId,r.seed,r.initialViewport,r.startedAtMs);for(const e of r.events.slice(replay.events.length))replay=apply(replay,e);need(equal(replay,r),'event-snapshot-mismatch');cache.set(r.roundId,structuredClone(replay));if(cache.size>16)cache.delete(cache.keys().next().value);return r;}

export function restoreWorld(r){return (r.contractVersion===legacy.VERSION?FormalCart:FeedbackCart).restore(r.seed,r.plan,r.world);}
