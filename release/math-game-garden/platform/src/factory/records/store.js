import { startChallenge, applyChallengeEvent } from '../../learning/challenge-events.js';
import { inspectChallengeEntry } from '../../contracts/challenge.js';
import { encodeChallengeRecord, decodeChallengeStore, copy, stable, recordError, MAX_STORE_CHARS } from './codec.js';
import { createIndexedDBTransactions } from './indexeddb.js';

export const CHALLENGE_STORAGE_KEY='radical-adventure.factory.challenge.v1';
export const CHALLENGE_LOCK_NAME='radical-adventure.factory.challenge.writer.v1';

/** Browser writes require IndexedDB transactions; Web Locks remain an additional
 * capability/coordination policy. Synchronous storage injection is legacy test-only.
 * No clear(), removal, round replacement, eligibility unlock or practice-key writes.
 */
export function createChallengeRepository({storage,locks,transactions,now=()=>new Date().toISOString()}={}) {
  let loaded=null, raw=null, status={kind:'idle',saved:false,message:'尚未讀取挑戰紀錄。'}, pending=null, isolated=null;
  const coordinated=()=>typeof locks?.request==='function';
  const stateAt=(data,id)=>data.states.find(s=>s.roundId===(id||data.document.activeRoundId))||null;
  function adopt(next,nextRaw) {loaded=next;raw=nextRaw;isolated=null;}
  function failure(error,{quarantine=false,original=null}={}) {
    if(quarantine)isolated={at:now(),code:error.code||'invalid-record',raw:original};
    status={kind:quarantine?'quarantined':'error',saved:false,code:error.code||error.name||'storage-error',
      message:quarantine?'挑戰資料異常，原文已隔離保留。停止自動恢復與寫入；請匯出供人工檢查。':
        '尚未確認保存。請勿把候選結果視為已提交；可用同一事件重試或匯出資料。'};
    return {ok:false,saved:false,status:copy(status)};
  }
  const atomic=work=>transactions?transactions.run(work):work(storage);
  function read(source=storage) {
    let currentRaw;
    try {if(!source)throw recordError('storage-unavailable','本機儲存不可用。');currentRaw=source.getItem(CHALLENGE_STORAGE_KEY);}
    catch(error){throw error;}
    try{return {data:decodeChallengeStore(currentRaw),raw:currentRaw};}
    catch(error){failure(error,{quarantine:true,original:currentRaw});throw error;}
  }
  function view() {
    const trustworthy=!!loaded&&!isolated&&!['error','quarantined'].includes(status.kind);
    return {status:copy(status),revision:loaded?.document.revision??null,
      state:trustworthy?copy(stateAt(loaded)):null,
      entry:trustworthy&&coordinated()&&!pending?inspectChallengeEntry(loaded.entry):{decision:'storage-blocked',canStartNew:false},
      readOnly:!coordinated()||!trustworthy||!!pending,
      requiresResumeConfirmation:trustworthy&&['in-progress','paused'].includes(stateAt(loaded)?.status),
      hasPending:!!pending};
  }
  async function locked(work) {
    if(!coordinated())throw recordError('coordination-unavailable','不支援可靠的跨分頁協調，僅可唯讀。');
    return locks.request(CHALLENGE_LOCK_NAME,{mode:'exclusive'},lock=>{
      if(!lock)throw recordError('coordination-unavailable','未取得寫入鎖。');
      return work();
    });
  }
  function savedResult(data,duplicate=false,roundId=null) {
    status={kind:'saved',saved:true,message:transactions?'挑戰交易已完整提交確認。':'測試儲存已寫入並讀回確認。'};
    return {ok:true,saved:true,duplicate,revision:data.document.revision,state:copy(stateAt(data,roundId)),entry:inspectChallengeEntry(data.entry)};
  }
  async function commit(command,expectedRevision) {
    const identity=stable(command);
    if(pending&&stable(pending.command)!==identity)return failure(recordError('pending-command','先處理尚未確認保存的原命令。'));
    try {
      return await locked(async()=>{
        const outcome=await atomic(source=>{
        if(isolated)throw recordError('quarantined-records','請先匯出異常資料供人工處理。');
        const fresh=read(source);
        // A prior write may have succeeded while its readback/acknowledgement failed.
        if(pending?.proposedRaw===fresh.raw) {
          return {fresh,duplicate:true};
        }
        const prior=command.kind==='start'?stateAt(fresh.data,command.options.roundId):stateAt(fresh.data,command.event.roundId);
        if(prior) {
          const event=command.kind==='start'?{id:command.options.eventId,type:'start-challenge',roundId:command.options.roundId,at:command.options.at}:command.event;
          const old=prior.events.find(e=>e.id===event.id);
          if(old) {
            if(stable(old)!==stable(event)||(command.kind==='start'&&stable(prior.questions)!==stable(command.options.questions)))throw recordError('event-conflict','同一事件識別碼內容不同。');
            // A matching committed ID is acknowledged without writing, even from a stale tab.
            return {fresh,duplicate:true,roundId:prior.roundId};
          }
        }
        if(expectedRevision!==fresh.data.document.revision)throw recordError('stale-revision','舊分頁不能覆蓋新進度，請先重新載入。');
        let candidate;
        if(command.kind==='start') {
          candidate=startChallenge({...command.options,entry:fresh.data.entry});
        } else {
          if(!prior)throw recordError('missing-round','找不到原回合，不可重新抽題代替。');
          if(command.event.roundId!==fresh.data.document.activeRoundId)throw recordError('inactive-round','歷史回合僅可唯讀回顧。');
          candidate=applyChallengeEvent(prior,command.event);
        }
        const record=encodeChallengeRecord(candidate);
        const records=command.kind==='start'?[...fresh.data.document.records,record]:fresh.data.document.records.map(r=>r.snapshot.roundId===candidate.roundId?record:r);
        const document={schemaVersion:1,revision:fresh.data.document.revision+1,activeRoundId:candidate.roundId,records};
        const proposedRaw=JSON.stringify(document);
        if(proposedRaw.length>MAX_STORE_CHARS)throw recordError('resource-limit','挑戰歷史已達容量上限，停止寫入，不清除舊需求。');
        const verified=decodeChallengeStore(proposedRaw);
        pending={command:copy(command),expectedRevision,candidate:copy(candidate),proposedRaw};
        source.setItem(CHALLENGE_STORAGE_KEY,proposedRaw);
        const echoed=source.getItem(CHALLENGE_STORAGE_KEY);
        if(echoed!==proposedRaw)throw recordError('readback-mismatch','儲存讀回不一致，不能宣稱已保存。');
        return {fresh:{data:verified,raw:proposedRaw},duplicate:false};
        });
        // No confirmed state or saved acknowledgement before transaction complete.
        adopt(outcome.fresh.data,outcome.fresh.raw);pending=null;
        return savedResult(outcome.fresh.data,outcome.duplicate,outcome.roundId);
      });
    } catch(error) {if(error.originalRaw!==undefined){if(error.code?.startsWith('legacy-')){isolated={at:now(),code:error.code,raw:error.originalRaw};failure(error);}else failure(error,{quarantine:true,original:error.originalRaw});}if(isolated)return {ok:false,saved:false,status:copy(status)};return failure(error);}
  }
  return {
    async load() {
      try {
        const readFresh=async()=>{const fresh=await atomic(source=>read(source));adopt(fresh.data,fresh.raw);
          status={kind:pending?'pending':coordinated()?'ready':'read-only',saved:!pending,
            message:pending?'已載入保存資料；原命令尚未確認，需重試。':coordinated()?'已驗證並恢復保存的原回合。':'缺少Web Locks，僅可唯讀；正式事件不允許寫入。'};
          return view();};
        return coordinated()?await locked(readFresh):await readFresh();
      } catch(error) {if(error.originalRaw!==undefined){if(error.code?.startsWith('legacy-')){isolated={at:now(),code:error.code,raw:error.originalRaw};failure(error);}else failure(error,{quarantine:true,original:error.originalRaw});}else if(!isolated)failure(error);return view();}
    },
    start(options,{expectedRevision=loaded?.document.revision}={}) {
      // Ignore caller-supplied entry/grades: derive admission inside the lock.
      try {
        const command={kind:'start',options:{roundId:options.roundId,questions:options.questions,at:options.at,eventId:options.eventId}};
        stable(command);return commit(copy(command),expectedRevision);
      }catch(error){return Promise.resolve(failure(error));}
    },
    dispatch(event,{expectedRevision=loaded?.document.revision}={}) {
      try{stable(event);return commit({kind:'event',event:copy(event)},expectedRevision);}catch(error){return Promise.resolve(failure(error));}
    },
    retry() {return pending?commit(copy(pending.command),pending.expectedRevision):Promise.resolve(failure(recordError('no-pending-command','沒有待重試的命令。')));},
    getView:view,
    getConfirmedState:()=>loaded?copy(stateAt(loaded)):null,
    getHistory:()=>loaded?copy(loaded.states):[],
    getPending:()=>pending?{command:copy(pending.command),candidate:copy(pending.candidate),confirmed:false}:null,
    async importLegacy(selectedRaw){
      try{if(!transactions?.importLegacy)throw recordError('import-unavailable','沒有交易式匯入接口。');
        const out=await locked(()=>transactions.importLegacy(selectedRaw));await this.load();
        if(isolated||status.kind==='error'||status.kind==='quarantined')return {ok:false,saved:false,status:copy(status)};
        return {ok:true,saved:true,...out};
      }catch(error){return failure(error);}
    },
    exportRecovery:()=>({schemaVersion:1,status:copy(status),originalRaw:isolated?.raw??raw,isolated:copy(isolated),pending:pending?{command:copy(pending.command),candidate:copy(pending.candidate),confirmed:false}:null}),
    async backupQuarantine() {
      try {return await locked(()=>atomic(source=>{
        if(!isolated||typeof isolated.raw!=='string')throw recordError('no-quarantine','沒有可備份的隔離原文。');
        if(source.getItem(CHALLENGE_STORAGE_KEY)!==isolated.raw)throw recordError('stale-revision','原資料已改變，停止備份。');
        const suffix=globalThis.crypto?.randomUUID?.();
        if(!suffix)throw recordError('backup-unavailable','無法建立安全的備份識別碼，請使用匯出。');
        const key=`${CHALLENGE_STORAGE_KEY}.quarantine.${suffix}`;
        source.setItem(key,isolated.raw);if(source.getItem(key)!==isolated.raw)throw recordError('backup-failed','隔離備份讀回失敗。');
        return {ok:true,key,originalPreserved:true};
      }));}catch(error){return {ok:false,code:error.code||error.name};}
    },
  };
}

/** Browser adapter is deliberately not mounted or connected to platform routes. */
export function createBrowserChallengeRepository(env=globalThis) {
  let storage=null,locks=null;
  try{storage=env.localStorage;}catch{/* load reports unavailable; never falls back to memory */}
  try{locks=env.navigator?.locks;}catch{/* no coordination means read-only */}
  let indexedDB=null;try{indexedDB=env.indexedDB;}catch{/* fail closed */}
  return createChallengeRepository({storage,locks,transactions:createIndexedDBTransactions({indexedDB,legacyStorage:storage})});
}
