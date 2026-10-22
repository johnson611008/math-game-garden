import {makePlan} from './questions.js';
import {FormalWorld} from './world.js';
import {slotIds,STAGES} from './stages.js';
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(v,c)=>{if(!v)throw Error(c);};
export function grade(r){const first=Object.values(r.slots).filter(s=>s.first),correct=first.filter(s=>s.first.correct).length;return {count:first.length,firstCorrect:correct,status:first.length<10?'incomplete':correct>=8?'passed':'not-met',impossible:first.length-correct>=3};}
function world(r,snapshot=r.world){return new FormalWorld(r.seed+r.stageIndex).configure(r.stageIndex,r.plan,r.slots,snapshot);}
function attempt(r,id){need(typeof id==='string'&&id&&!r.stages.some(s=>s.attempts.some(a=>a.id===id)),'invalid-attempt-id');r.attemptId=id;r.stages[r.stageIndex].attempts.push({id,status:'active'});r.world=world(r,null).snapshot();}
export function startRound(roundId,seed,attemptId,at){need(typeof roundId==='string'&&roundId.length>0&&Number.isInteger(seed)&&seed>=0&&seed<=4294967295&&Number.isFinite(Date.parse(at)),'invalid-start');const plan=makePlan(seed),slots=Object.fromEntries(Object.keys(plan).map((id,i)=>[id,{id,kind:STAGES[Math.floor(i/2)].kind==='mixed'?['merge','simplify'][i%2]:STAGES[Math.floor(i/2)].kind,attempts:[],first:null,outcome:'unstarted'}]));const r={contractVersion:'bubble-five-v1',roundId,seed,initialAttemptId:attemptId,startedAt:at,stageIndex:0,attemptId:null,phase:'active',settledAt:null,needsRemediation:false,slots,plan,stages:STAGES.map((s,i)=>({name:s.name,unlocked:i===0,completed:false,attempts:[]})),world:null,events:[]};attempt(r,attemptId);return r;}
export function apply(round,event){need(event&&typeof event.id==='string'&&event.id&&event.roundId===round.roundId&&Number.isFinite(Date.parse(event.at)),'invalid-event');const prev=round.events.find(e=>e.id===event.id);if(prev){need(equal(prev,event),'event-conflict');return structuredClone(round);}need(round.phase!=='settled','settled-read-only');const r=structuredClone(round),t=event.type;
 if(t==='settle'){need(r.phase==='awaiting-settlement'&&grade(r).count===10&&r.stages.every(s=>s.completed),'not-ready-to-settle');r.phase='settled';r.settledAt=event.at;r.needsRemediation=grade(r).status==='not-met';}
 else if(t==='confirm-stage'){need(r.phase==='active'&&r.world.phase==='won'&&slotIds(r.stageIndex).every(id=>['success','failed'].includes(r.slots[id].outcome)),'stage-not-complete');r.stages[r.stageIndex].completed=true;r.stages[r.stageIndex].attempts.at(-1).status='cleared';if(r.stageIndex===4)r.phase='awaiting-settlement';else{r.stageIndex++;r.stages[r.stageIndex].unlocked=true;attempt(r,event.attemptId);}}
 else if(t==='retry'){need(r.phase==='active'&&r.world.phase==='lost','not-failed');r.stages[r.stageIndex].attempts.at(-1).status='failed';attempt(r,event.attemptId);}
 else{need(r.phase==='active','round-not-active');need(!event.checkpoint,'untrusted-checkpoint-not-supported');const w=world(r);
  if(t==='shoot'){need(event.direction&&Number.isFinite(event.direction.x)&&Number.isFinite(event.direction.y),'invalid-direction');need(w.shoot(event.direction),'cannot-shoot');}
  else if(t==='physics'){need(!w.paused&&w.phase==='play'&&Number.isInteger(event.ticks)&&event.ticks>=1&&event.ticks<=2400,'invalid-physics-ticks');for(let i=0;i<event.ticks&&w.phase==='play'&&w.status==='playing';i++)w.update(1/120);if(w.phase==='play'&&['won','lost'].includes(w.status))w.phase=w.status;}
  else if(t==='pause')need(w.pause(),'not-pausable');
  else if(t==='continue'){if(w.phase==='recovering')need(w.resume(),'not-recovering');else need(w.paused&&w.pause(),'not-paused');}
  else if(t==='answer'){const result=w.submit(event.questionId,event.answer,event.id);need(result.accepted,'input-not-consumed:'+result.code);}
  else throw Error('unknown-event');r.world=w.snapshot();
 }
 r.events.push(structuredClone(event));return r;
}
const replayCache=new Map();
export function validateRound(r){need(r.contractVersion==='bubble-five-v1'&&Array.isArray(r.events)&&r.events.length<=20000,'unsupported-bubble-round');const cached=replayCache.get(r.roundId),prefix=cached&&cached.seed===r.seed&&cached.initialAttemptId===r.initialAttemptId&&cached.startedAt===r.startedAt&&cached.events.length<=r.events.length&&equal(cached.events,r.events.slice(0,cached.events.length));let replay=prefix?structuredClone(cached):startRound(r.roundId,r.seed,r.initialAttemptId,r.startedAt);for(const e of r.events.slice(replay.events.length))replay=apply(replay,e);need(equal(r,replay),'event-snapshot-mismatch');replayCache.set(r.roundId,structuredClone(replay));if(replayCache.size>32)replayCache.delete(replayCache.keys().next().value);return r;}
