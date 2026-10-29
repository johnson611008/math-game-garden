// Local admission authority: existing immutable settled results, no new scores.
// Dependencies are loaded only during validation to avoid unit-four store cycles.
export const POLICY='garden-prerequisites-all-formal-passed-v1';
export const SOURCES=Object.freeze([
 {unit:1,title:'第一單元：根式化簡',db:'radical-garden.mole15.transactions.v1',key:'mole15-ledger-v1.default',module:'../../mole-formal/store.js',learning:'../../mole-formal/remediation.js'},
 {unit:2,title:'第二單元：根式乘除',db:'radical-garden.marble-five.transactions.v1',key:'marble-five-ledger-v1.default',module:'../../marble-formal/store.js',learning:'../../unit-two/learning.js'},
 {unit:3,title:'第三單元：根式加減',db:'radical-garden.bubble-five.transactions.v1',key:'bubble-five-ledger-v1.default',module:'../../bubble-formal/store.js',learning:'../../unit-three/learning.js'},
 {unit:4,title:'第四單元：根式四則運算',db:'radical-garden.crystal-cart.transactions.v1',key:'crystal-cart-ledger-v1.default',module:'../../crystal-cart-formal/store.mjs',learning:'../../unit-four/learning.mjs'},
].map(Object.freeze));
const need=(v,c)=>{if(!v)throw Error(c);};
export function evaluateAdmission(target,facts){need([4,5].includes(target),'unsupported-admission-target');const required=SOURCES.slice(0,target-1),missing=[],errors=[],evidence=[];
 for(const s of required){const f=facts.find(f=>f.unit===s.unit);if(!f||f.error){missing.push({unit:s.unit,title:s.title});if(f?.error)errors.push({unit:s.unit,code:f.error});}else if(!f.passed)missing.push({unit:s.unit,title:s.title});else evidence.push({unit:s.unit,roundId:f.roundId,settledAt:f.settledAt});}
 return {policyVersion:POLICY,target,allowed:missing.length===0&&errors.length===0,code:errors.length?'prerequisite-read-failed':missing.length?'prerequisite-required':'prerequisites-confirmed',missing,errors,evidence};
}
// Read existing databases only. Aborting an upgrade for a missing DB leaves no
// newly created database; a read must never migrate or manufacture a score.
// Enumeration is advisory and may be unavailable, stale or fail on a browser.
// Probe the fixed name directly; abort an absent DB's versionchange transaction.
export async function readExisting(indexedDB,s){return new Promise((resolve,reject)=>{
 if(!indexedDB?.open){reject(Error('indexeddb-unavailable'));return;}let absent=false,done=false;const request=indexedDB.open(s.db);
 request.onupgradeneeded=()=>{absent=true;request.transaction.abort();};request.onblocked=()=>{done=true;reject(Error('prerequisite-database-blocked'));};
 request.onerror=()=>{if(done)return;done=true;absent?resolve({record:null,keys:[]}):reject(request.error||Error('prerequisite-open-failed'));};
 request.onsuccess=()=>{const db=request.result;if(done){db.close();return;}if(db.version!==1||!db.objectStoreNames.contains('ledgers')){done=true;db.close();reject(Error('unsupported-prerequisite-database'));return;}
  try{let record=null,keys=[],error;const tx=db.transaction('ledgers','readonly'),store=tx.objectStore('ledgers'),get=store.get(s.key),all=store.getAllKeys();get.onsuccess=()=>record=get.result??null;all.onsuccess=()=>keys=all.result;get.onerror=()=>error=get.error;all.onerror=()=>error=all.error;
  tx.oncomplete=()=>{done=true;db.close();resolve({record,keys});};tx.onabort=()=>{done=true;db.close();reject(error||tx.error||Error('prerequisite-read-aborted'));};}catch(e){done=true;db.close();reject(e);}
 };
});}
export async function validateSource(s,envelope){if(envelope===null)return {unit:s.unit,passed:false};need(envelope?.formatVersion===1&&typeof envelope.raw==='string'&&envelope.extras&&typeof envelope.extras==='object'&&!Array.isArray(envelope.extras)&&(envelope.legacyRaw===null||typeof envelope.legacyRaw==='string'),'unsupported-prerequisite-record');
 const model=await import(s.module),learningModel=await import(s.learning),doc=model.decode(envelope.raw),learning=learningModel.decodeLearning(envelope.extras[learningModel.EXTRA]??null,doc);
 if(s.unit===4){const q=await import('../../unit-four/qualification.mjs');q.decodeQualifications(envelope.extras[q.QUALIFICATION_EXTRA]??null,doc,learning);const c=await import('./admission-clock.mjs');c.decodeClock(envelope.extras[c.EXTRA]??null,doc);}
 const passed=doc.rounds.find(r=>r.phase==='settled'&&(s.unit===1?r.settlement?.passed===true:s.unit===4?r.settlement?.status==='passed':!r.remediationRequired&&!r.needsRemediation&&(Object.values(r.slots).filter(v=>v.first?.correct).length>=8)));
 return {unit:s.unit,passed:!!passed,...(passed?{roundId:passed.roundId||passed.id,settledAt:passed.settledAt||passed.settlement?.atMs||passed.settlement?.at}: {})};
}
export function createAdmissionReader({readUnit,legacyValue=()=>null}={}){const cache=new Map();async function fact(s){try{const {record,keys=[]}=await readUnit(s);need(keys.every(k=>k===s.key),'namespace-ownership-review-required');const legacy=legacyValue(s);need(s.unit===1?(record?record.legacyRaw===legacy:legacy===null):!record||record.legacyRaw===null,'legacy-source-review-required');const fingerprint=JSON.stringify(record),cached=cache.get(s.unit);if(cached?.fingerprint===fingerprint)return cached.fact;const result=await validateSource(s,record);cache.set(s.unit,{fingerprint,fact:result});return result;}catch(e){return {unit:s.unit,passed:false,error:e.message||'prerequisite-read-failed'};}}
 return {async check(target){return evaluateAdmission(target,await Promise.all(SOURCES.slice(0,target-1).map(fact)));},async both(){const facts=await Promise.all(SOURCES.map(fact));return {4:evaluateAdmission(4,facts),5:evaluateAdmission(5,facts)};}};
}
export function browserAdmission(){return createAdmissionReader({readUnit:s=>readExisting(globalThis.indexedDB,s),legacyValue:s=>{if(s.unit!==1)return null;const storage=globalThis.localStorage;for(let i=0;i<(storage?.length||0);i++){const k=storage.key(i);if(k?.startsWith('mole15-ledger-v1.')&&k!==s.key)throw Error('namespace-ownership-review-required');}return storage?.getItem(s.key)??null;}});}
