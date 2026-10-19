import { CHALLENGE_STORAGE_KEY } from './store.js';
import { decodeChallengeStore, recordError } from './codec.js';

export const CHALLENGE_DB='radical-adventure.factory.challenge.transactions.v1';
// The only async work before a transaction is opening the database. The work
// callback is synchronous inside get.onsuccess; put/complete never awaits a timer.
export function createIndexedDBTransactions({indexedDB,dbName=CHALLENGE_DB,key=CHALLENGE_STORAGE_KEY,
  legacyStorage,legacyKey=CHALLENGE_STORAGE_KEY,getFault=()=> 'none',clearFault=()=>{}}={}) {
  let opening=null;
  function open(){
    if(!indexedDB?.open)return Promise.reject(recordError('transaction-storage-unavailable','IndexedDB不可用；拒絕寫入，不回退localStorage。'));
    if(!opening)opening=new Promise((resolve,reject)=>{
      let blocked=false;const req=indexedDB.open(dbName,1);
      req.onupgradeneeded=()=>req.result.createObjectStore('ledgers');
      req.onblocked=()=>{blocked=true;opening=null;reject(recordError('database-blocked','資料庫升級被其他分頁阻擋。'));};
      req.onerror=()=>{opening=null;reject(req.error);};
      req.onsuccess=()=>{const db=req.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
    });return opening;
  }
  const legacy=()=>{if(!legacyStorage)throw recordError('legacy-unavailable','無法確認舊資料，停止自動開始。');return legacyStorage.getItem(legacyKey);};
  async function execute(work,{importRaw}={}){
    const db=await open(); // No transaction exists yet.
    return new Promise((resolve,reject)=>{
      let result,error,wrote=false,ackFailure=false;
      const tx=db.transaction('ledgers','readwrite'),store=tx.objectStore('ledgers');
      const fail=e=>{error=e;try{tx.abort();}catch{/* abort may already be in progress */}};
      tx.onabort=()=>reject(error||tx.error||recordError('transaction-aborted','交易已中止，未確認保存。'));
      tx.onerror=()=>{};
      tx.oncomplete=()=>{
        if(ackFailure){clearFault();reject(recordError('acknowledgement-failed','交易已提交，但測試注入確認失敗；請以原事件ID重試。'));}
        else resolve(result);
      };
      const get=store.get(key);
      get.onsuccess=()=>{try{
        if(getFault()==='read-denied')throw Object.assign(new Error('讀取拒絕（測試注入）'),{name:'SecurityError'});
        const source=legacy(),existing=get.result;
        if(existing&&(existing.formatVersion!==1||typeof existing.raw!=='string'||!existing.extras||!(existing.legacyRaw===null||typeof existing.legacyRaw==='string')))
          throw Object.assign(recordError('unsupported-transaction-record','交易紀錄版本或內容不相容，保留原文。'),{originalRaw:JSON.stringify(existing,(_k,v)=>typeof v==='bigint'?String(v):v)});
        let record=existing?structuredClone(existing):{formatVersion:1,raw:null,legacyRaw:null,extras:{}};
        if(importRaw!==undefined){
          if(typeof importRaw!=='string'||source!==importRaw)throw recordError('legacy-source-changed','舊資料與選定原文不同，停止匯入。');
          decodeChallengeStore(importRaw);
          if(existing){if(record.legacyRaw!==importRaw)throw recordError('legacy-import-conflict','新庫已有不同資料，禁止覆寫。');result={imported:false,duplicate:true};return;}
          record.raw=importRaw;record.legacyRaw=importRaw;wrote=true;result={imported:true,duplicate:false};
        }else{
          if(!existing&&source!==null)throw Object.assign(recordError('legacy-import-required','找到舊回合，須先驗證並明確匯入；不可直接新開。'),{originalRaw:source});
          if(existing&&source!==record.legacyRaw)throw Object.assign(recordError('legacy-source-changed','舊版分頁資料已變動，停止寫入；請匯出供人工處理。'),{originalRaw:source});
          const storage={getItem(k){return k===CHALLENGE_STORAGE_KEY?record.raw:record.extras[k]??null;},setItem(k,v){if(k===CHALLENGE_STORAGE_KEY)record.raw=v;else record.extras[k]=v;wrote=true;}};
          result=work(storage);
          if(result&&typeof result.then==='function')throw recordError('async-transaction-work','交易內不允許非同步工作。');
        }
        if(wrote){
          if(getFault()==='quota')throw Object.assign(new Error('quota（安全測試注入）'),{name:'QuotaExceededError'});
          if(getFault()==='write-denied')throw Object.assign(new Error('寫入拒絕（測試注入）'),{name:'SecurityError'});
          const put=store.put(record,key);
          if(getFault()==='abort-after-put')put.onsuccess=()=>fail(recordError('injected-abort','put request成功後交易中止（測試注入）。'));
          ackFailure=getFault()==='readback-once';
        }
      }catch(e){fail(e);}};
    });
  }
  return {run:work=>execute(work),importLegacy:raw=>execute(null,{importRaw:raw}),
    legacyRaw:legacy,dbName,key,async readRaw(){return execute(s=>s.getItem(CHALLENGE_STORAGE_KEY));}};
}
