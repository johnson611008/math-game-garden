import {browserAdmission,evaluateAdmission} from '../src/learning/cross-unit-admission.mjs';
import {createIndexedDBTransactions} from '../src/factory/records/indexeddb.js';
import {CHALLENGE_STORAGE_KEY as SLOT} from '../src/factory/records/store.js';
import {startRound,apply,validateRound,grade,equal} from './state.mjs';
import {EXTRA,empty,decodeLearning,reduce,entry} from '../unit-five/learning.mjs';
import {QUALIFICATION_EXTRA,emptyQualifications,decodeQualifications,reduceQualifications,availableQualification,eligibleAttempt,claimRequest} from '../unit-five/qualification.mjs';
export const DB='radical-garden.rescue-ten.transactions.v1';
export const PRODUCTION_KEY='rescue-ten-ledger-v1.default';
export function decode(raw){
 if(raw===null)return {schemaVersion:1,revision:0,active:null,rounds:[]};
 const d=JSON.parse(raw);
 if(equal(d,{schemaVersion:1,revision:0,active:null,rounds:[]}))return d;
 if(d?.schemaVersion!==1||!Number.isSafeInteger(d.revision)||d.revision<1||!Array.isArray(d.rounds)||!d.rounds.length||d.active!==d.rounds.at(-1).roundId||d.revision!==d.rounds.reduce((n,r)=>n+1+(r.events?.length??0),0))throw Error('unsupported-rescue-ledger');
 if(Object.keys(d).sort().join()!=='active,revision,rounds,schemaVersion')throw Error('unsupported-ledger-fields');
 const ids=new Set();let previous=null;
 // Shape/replay decoder keeps the original raw format. Every authority read also
 // verifies failed->new-round links against the independent consumed rights.
 for(const r of d.rounds){validateRound(r);if(ids.has(r.roundId))throw Error('duplicate-round');if(previous&&(previous.phase!=='settled'||r.startedAtMs<previous.settlement.atMs))throw Error('invalid-round-history');ids.add(r.roundId);previous=r;}return d;
}
export function createStore(transactions,locks,{now=Date.now,lockName=PRODUCTION_KEY,admission=browserAdmission()}={}){
 let doc=decode(null),learning=empty(),qualifications=emptyQualifications(),blocked=false,pending=false,status={saved:false,code:'loading'};
 let access={...evaluateAdmission(5,[]),code:'prerequisite-checking'};
 function readPair(t){const document=decode(t.getItem(SLOT)),learning=decodeLearning(t.getItem(EXTRA),document),qualifications=decodeQualifications(t.getItem(QUALIFICATION_EXTRA),document,learning);return {document,learning,qualifications};}
 function view(){const state=doc.rounds.at(-1)||null,qualification=availableQualification(qualifications,state?.roundId),candidate=state?.phase==='settled'&&grade(state).status==='not-met'?eligibleAttempt(learning,state.roundId):null,qualificationCandidate=candidate&&!qualifications.grants.some(g=>g.attemptId===candidate.attemptId)?claimRequest(candidate):null,isRechallenge=qualifications.grants.some(g=>g.usedByRoundId===state?.roundId);let remediationEntry=entry(learning,state);
  if(qualification)remediationEntry={label:'重新挑戰 Boss',message:'補救已達標，一次性重挑資格已確認保存',progress:10,action:'retry'};
  else if(qualificationCandidate)remediationEntry={label:'確認補救成果',message:'正在確認既有達標紀錄，尚未核發資格',progress:10,action:'claim'};
  else if(remediationEntry){remediationEntry={...remediationEntry,label:remediationEntry.label==='繼續補救'?'繼續補救練功':remediationEntry.label};if(isRechallenge)remediationEntry.message='需要再次完成指定補救；'+remediationEntry.message;}
  const challengeStatus=state?.phase==='settled'?(grade(state).status==='passed'?'人質救援成功':remediationEntry?.label||'需要指定補救'):state?'繼續 Boss 決戰':'拯救人質！';
  return {admission:structuredClone(access),document:structuredClone(doc),state:structuredClone(state),revision:doc.revision,learning:structuredClone(learning),learningRevision:learning.revision,qualifications:structuredClone(qualifications),qualificationRevision:qualifications.revision,qualification:structuredClone(qualification),qualificationCandidate:structuredClone(qualificationCandidate),isRechallenge,challengeStatus,learningReadOnly:blocked||pending||!locks?.request||!access.allowed,remediationEntry,pending,status:{...status,...(status.saved&&!access.allowed?{code:access.code}:{})},readOnly:blocked||pending||!locks?.request||!access.allowed||state?.phase==='settled',canStart:access.allowed&&!blocked&&!pending&&!!locks?.request&&(!state||state.phase==='settled'&&(grade(state).status==='passed'||!!qualification))};}
 async function load(){try{access=await admission.check(5);const pair=await transactions.run(readPair);doc=pair.document;learning=pair.learning;qualifications=pair.qualifications;blocked=false;status={saved:true,code:locks?.request?'ready':'read-only-no-locks'};}catch(e){blocked=true;status={saved:false,code:e.message};}return view();}
 async function admittedRun(work){access=await admission.check(5);if(!access.allowed)throw Error(access.code);return transactions.run(work);}
 async function commit(command){
  if(blocked||pending||!locks?.request)return {saved:false,code:'read-only-or-pending'};
  pending=true;const revision=doc.revision,learningRevision=learning.revision,qualificationRevision=qualifications.revision;
  try{
   const result=await locks.request(lockName,{mode:'exclusive'},()=>admittedRun(t=>{
    const pair=readPair(t),fresh=pair.document,authority=pair.learning;let rights=pair.qualifications;
    if(!command||Object.keys(command).length!==1||['start','event','learning','qualification'].filter(k=>command[k]).length!==1)throw Error('ambiguous-command');
    if(command.start){const s=command.start;if(Object.keys(s).some(k=>!['roundId','qualificationId','sourceRoundId'].includes(k))||!Object.hasOwn(s,'roundId'))throw Error('unsupported-start-fields');const old=fresh.rounds.find(r=>r.roundId===s.roundId);if(old){const g=rights.grants.find(g=>g.usedByRoundId===old.roundId);if(g?g.qualificationId!==s.qualificationId||g.sourceRoundId!==s.sourceRoundId:s.qualificationId!=null||s.sourceRoundId!=null)throw Error('start-conflict');return pair;}}
    if(command.event){const e=command.event;if(Object.hasOwn(e,'atMs'))throw Error('untrusted-event-clock');const old=fresh.rounds.at(-1)?.events.find(x=>x.id===e.id);if(old){const {atMs,...request}=old;if(!equal(request,e))throw Error('event-conflict');return pair;}}
    if(command.learning){const e=command.learning;if(Object.hasOwn(e,'atMs'))throw Error('untrusted-learning-clock');const old=authority.events.find(x=>x.id===e.id);if(old){const {atMs,...request}=old;if(!equal(request,e))throw Error('learning-event-conflict');return pair;}}
    if(command.qualification){const e=command.qualification;if(Object.hasOwn(e,'atMs'))throw Error('untrusted-qualification-clock');const old=rights.events.find(x=>x.id===e.id);if(old){const {atMs,...request}=old;if(!equal(request,e))throw Error('qualification-event-conflict');return pair;}}
    if(fresh.revision!==revision||authority.revision!==learningRevision||rights.revision!==qualificationRevision)throw Error('stale-revision');
    const atMs=now();if(!Number.isSafeInteger(atMs)||atMs<0)throw Error('invalid-clock');
    if(command.qualification){const q=command.qualification;if(q.type!=='issue')throw Error('qualification-internal-consume-only');if(fresh.active!==q.sourceRoundId)throw Error('qualification-source-not-current');rights=reduceQualifications(rights,{...structuredClone(q),atMs},fresh,authority);const raw=JSON.stringify(rights);if(raw.length>8000000)throw Error('qualification-capacity-export-required');decodeQualifications(raw,fresh,authority);t.setItem(QUALIFICATION_EXTRA,raw);return {document:fresh,learning:authority,qualifications:rights};}
    if(command.learning){const updated=reduce(authority,{...structuredClone(command.learning),atMs},fresh),raw=JSON.stringify(updated);if(raw.length>8000000)throw Error('learning-capacity-export-required');decodeLearning(raw,fresh);
     if(command.learning.type==='finish'){const a=updated.attempts.find(a=>a.attemptId===command.learning.attemptId);if(eligibleAttempt({attempts:[a]},a.sourceRoundId))rights=reduceQualifications(rights,{...claimRequest(a),atMs},fresh,updated);}
     const qRaw=JSON.stringify(rights);if(qRaw.length>8000000)throw Error('qualification-capacity-export-required');decodeQualifications(qRaw,fresh,updated);t.setItem(EXTRA,raw);if(rights.revision!==qualificationRevision)t.setItem(QUALIFICATION_EXTRA,qRaw);return {document:fresh,learning:updated,qualifications:rights};}
    const next=structuredClone(fresh);
    if(command.start){const prior=next.rounds.at(-1),s=command.start;let grant=null;if(prior&&prior.phase!=='settled')throw Error('resume-existing-round');if(prior&&grade(prior).status==='not-met'){grant=availableQualification(rights,prior.roundId);if(!grant||s.qualificationId!==grant.qualificationId||s.sourceRoundId!==prior.roundId)throw Error('remediation-required-no-unlock');}else if(s.qualificationId!=null||s.sourceRoundId!=null)throw Error('unexpected-qualification');if(prior&&atMs<prior.settlement.atMs)throw Error('clock-rollback');const r=startRound(s.roundId,atMs);next.rounds.push(r);next.active=r.roundId;if(grant)rights=reduceQualifications(rights,{id:'consume:'+s.roundId,type:'consume',sourceRoundId:prior.roundId,qualificationId:grant.qualificationId,newRoundId:s.roundId,atMs},next,authority);}
    else{if(!next.rounds.length)throw Error('no-round');next.rounds[next.rounds.length-1]=apply(next.rounds.at(-1),{...structuredClone(command.event),atMs});}
    next.revision++;const raw=JSON.stringify(next),qRaw=JSON.stringify(rights);if(raw.length>8000000||qRaw.length>8000000)throw Error('ledger-capacity-export-required');decode(raw);decodeLearning(JSON.stringify(authority),next);decodeQualifications(qRaw,next,authority);t.setItem(SLOT,raw);if(rights.revision!==qualificationRevision)t.setItem(QUALIFICATION_EXTRA,qRaw);return {document:next,learning:authority,qualifications:rights};
   }));
   doc=result.document;learning=result.learning;qualifications=result.qualifications;status={saved:true,code:'committed'};return {saved:true,revision:doc.revision,learningRevision:learning.revision,qualificationRevision:qualifications.revision};
  }catch(e){blocked=true;status={saved:false,code:e.message};return {saved:false,code:e.message};}finally{pending=false;}
 }
 return {view,load,commit,exportRaw:()=>transactions.readRaw(),exportLearning:()=>transactions.run(t=>t.getItem(EXTRA)),exportQualifications:()=>transactions.run(t=>t.getItem(QUALIFICATION_EXTRA))};
}
export function browserStore(...options){
 if(options.length)throw Error('production-namespace-fixed');
 const wall=Date.now(),mono=performance.now();
 return createStore(createIndexedDBTransactions({indexedDB,dbName:DB,key:PRODUCTION_KEY,legacyStorage:{getItem:()=>null}}),navigator.locks,{now:()=>Math.max(Date.now(),wall+Math.floor(performance.now()-mono))});
}
