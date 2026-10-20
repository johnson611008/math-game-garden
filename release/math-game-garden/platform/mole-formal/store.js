import {createIndexedDBTransactions} from '../src/factory/records/indexeddb.js';
import {auditNamespaces} from '../unit-two/namespace-audit.js';
import {EXTRA,empty,decodeLearning,reduceLearning,availableGrant,equal} from './remediation.js';
import {CHALLENGE_STORAGE_KEY as SLOT} from '../src/factory/records/store.js';
import {startRound,apply,validateRound} from './state.js';
export const DB='radical-garden.mole15.transactions.v1',KEY='mole15-ledger-v1',PRODUCTION_KEY=KEY+'.default';
export function decode(raw){if(raw===null)return {schemaVersion:1,revision:0,active:null,rounds:[]};const d=JSON.parse(raw);if(d.schemaVersion!==1||!Number.isInteger(d.revision)||d.revision<1||!Array.isArray(d.rounds)||!d.rounds.length||d.active!==d.rounds.at(-1).id)throw Error('保存契約不相容，保留原文並停止');if(d.revision!==d.rounds.reduce((n,s)=>n+1+s.events.length,0))throw Error('?? revision ????????');const ids=new Set();for(const s of d.rounds){validateRound(s);if(ids.has(s.id))throw Error('重複回合');ids.add(s.id);}return d;}
export function createStore(transactions,locks){let doc=decode(null),learning=empty(),pending=false,status={saved:false,code:'loading'},blocked=false;
 const view=()=>({document:structuredClone(doc),learning:structuredClone(learning),unlock:structuredClone(availableGrant(learning,doc.rounds.at(-1)?.id)),state:structuredClone(doc.rounds.at(-1)||null),revision:doc.revision,learningRevision:learning.revision,pending,status:{...status},readOnly:blocked||!locks?.request||pending});
 const pair=t=>{const document=decode(t.getItem(SLOT));return {document,learning:decodeLearning(t.getItem(EXTRA),document)};};
 async function load(){try{const v=await transactions.run(pair);doc=v.document;learning=v.learning;blocked=false;status={saved:true,code:locks?.request?'ready':'read-only-no-locks'};}catch(e){blocked=true;status={saved:false,code:e.message};}return view();}
 async function commit(command){if(pending||blocked||!locks?.request)return {saved:false,code:'read-only-or-pending'};pending=true;const revision=doc.revision,lr=learning.revision;
  try{const result=await locks.request('mole15-writer',{mode:'exclusive'},()=>transactions.run(t=>{
   const fresh=pair(t);let next=structuredClone(fresh.document),authority=fresh.learning;
   if(command.event){const old=next.rounds.at(-1)?.events.find(e=>e.id===command.event.id);if(old){if(!equal(old,command.event))throw Error('event-conflict');return fresh;}}
   if(command.learning){const old=authority.events.find(e=>e.id===command.learning.id);if(old){if(!equal(old,command.learning))throw Error('remediation-event-conflict');return fresh;}}
   if(command.start){const old=next.rounds.find(r=>r.id===command.start.id);if(old){if(old.seed!==command.start.seed||old.at!==command.start.at)throw Error('start-conflict');return fresh;}}
   if(next.revision!==revision||authority.revision!==lr)throw Error('stale-revision');
   if(command.learning){if(command.learning.type==='consume-unlock')throw Error('internal-unlock-only');authority=reduceLearning(authority,command.learning,next);}
   else{
    if(command.start){const previous=next.rounds.at(-1);if(previous&&previous.phase!=='settled')throw Error('resume-existing-round');if(previous&&!previous.settlement.passed){const g=availableGrant(authority,previous.id);if(!g)throw Error('remediation-required-no-unlock');authority=reduceLearning(authority,{id:'consume:'+command.start.id,type:'consume-unlock',at:command.start.at,sourceRoundId:previous.id,unlockId:g.unlockId,newRoundId:command.start.id},next);}const x=command.start;next.rounds.push(startRound(x.id,x.seed,x.at));next.active=x.id;}
    else{if(!next.rounds.length)throw Error('尚未開始');if(command.event.roundId&&command.event.roundId!==next.active)throw Error('wrong-round');next.rounds[next.rounds.length-1]=apply(next.rounds.at(-1),command.event);}next.revision++;
   }
   const raw=JSON.stringify(next),extra=JSON.stringify(authority);if(raw.length>4000000||extra.length>8000000)throw Error('record-capacity-export-required');decode(raw);decodeLearning(extra,next);
   if(!command.learning)t.setItem(SLOT,raw);if(authority.revision!==lr)t.setItem(EXTRA,extra);return {document:next,learning:authority};
  }));doc=result.document;learning=result.learning;status={saved:true,code:'committed'};return {saved:true,revision:doc.revision,learningRevision:learning.revision};
  }catch(e){blocked=true;status={saved:false,code:e.message};return {saved:false,code:e.message};}finally{pending=false;}}
 return {view,load,commit,exportRaw:()=>transactions.readRaw(),exportLearning:()=>transactions.run(t=>t.getItem(EXTRA))};
}
export function browserStore(...options){if(options.length)throw Error('production-namespace-fixed');const tx=createIndexedDBTransactions({indexedDB,dbName:DB,key:PRODUCTION_KEY,legacyKey:PRODUCTION_KEY,legacyStorage:localStorage}),inner=createStore(tx,navigator.locks);let audit=null,error=null;
 const view=()=>({...inner.view(),namespaceAudit:audit,...(error?{readOnly:true,status:{saved:false,code:error}}:{})});
 async function guard(){audit=await auditNamespaces(indexedDB,DB,KEY,PRODUCTION_KEY);for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(KEY+'.')&&k!==PRODUCTION_KEY)audit.unresolved.push(k);}if(audit.unresolved.length)throw Error('namespace-ownership-review-required');}
 return {...inner,view,async load(){try{await guard();error=null;await inner.load();}catch(e){error=e.message;}return view();},async commit(c){try{await guard();if(error)return {saved:false,code:error};return await inner.commit(c);}catch(e){error=e.message;return {saved:false,code:error};}}};
}
