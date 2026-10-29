import {QUESTIONS,judge} from './questions.mjs';

export const PHASES=Object.freeze(['intro','battle','checking','hero-attacking','boss-attacking','correction','victory','defeat']);
export function createBattle(){return {phase:'intro',assets:'loading',index:0,heroHP:10,bossHP:10,records:[],pending:null,animation:null,serial:0,notice:'',initializations:0,endingPlayed:false};}
export function score(state){const first=state.records.filter(r=>r.first),correct=first.filter(r=>r.first.accepted).length;return {firstCount:first.length,firstCorrect:correct,completed:state.records.filter(r=>r.completed).length,heroHP:state.heroHP,bossHP:state.bossHP,outcome:state.phase==='victory'?'success':state.phase==='defeat'?'failure':'incomplete'};}
export function submit(state,answer){
 if(!['battle','correction'].includes(state.phase)||state.records[state.index]?.completed)return state;
 if(typeof answer!=='string'||answer.length>256)return state;
 const s=structuredClone(state),origin=s.phase,token=++s.serial;
 s.pending={token,origin,questionId:QUESTIONS[s.index].id,answer:answer.trim()};s.phase='checking';s.notice='正在精確驗算，尚未確認這次結果。';return s;
}
export function resolve(state,token){
 if(state.phase!=='checking'||state.pending?.token!==token)return state;
 const s=structuredClone(state),p=s.pending,q=QUESTIONS[s.index],r=s.records[s.index];
 if(p.questionId!==q.id)return state;
 const result=judge(q,p.answer);s.pending=null;
 if(!result.consumesFirst){s.phase=p.origin;s.notice=(result.status==='unsupported-expression'?'這個輸入寫法目前不支援；若分母含兩項，請先有理化，再輸入最簡答案。':result.message||'請完成數字、根號與括號。')+' 這次不消耗首次作答。';return s;}
 const attempt={answer:p.answer,accepted:result.accepted,status:result.status,kind:r.first?'correction':'first'};
 r.attempts.push(attempt);
 if(!r.first){
  r.first=structuredClone(attempt);
  if(result.accepted)s.bossHP--;else s.heroHP--;
  s.phase=result.accepted?'hero-attacking':'boss-attacking';
  s.animation={token:p.token,questionId:q.id,correct:result.accepted};
  s.notice=result.accepted?'攻擊成功！':'受到攻擊！';
 }else if(result.accepted){
  r.completed=true;r.corrected=true;s.phase='battle';s.notice='訂正成功！首次結果與血量保留，不會再次攻擊。';
 }else{s.phase='correction';s.notice=(result.status==='equivalent-not-simplest'?'數值等值，但尚未最簡。':'還需要調整。')+q.hint+' 訂正不再扣血。';}
 return s;
}
export function finishAttack(state,token){
 if(!['hero-attacking','boss-attacking'].includes(state.phase)||state.animation?.token!==token)return state;
 const s=structuredClone(state),correct=s.animation.correct;s.animation=null;
 if(correct){s.records[s.index].completed=true;s.phase='battle';s.notice='攻擊成功！這題已完成，可以前往下一題。';}
 else{s.phase='correction';s.notice='首次結果已記錄，不能回補血量。'+QUESTIONS[s.index].hint;}
 return s;
}
export function transition(state,action){
 if(action==='assets-ready')return {...state,assets:'ready'};
 if(action==='assets-failed')return {...state,assets:'failed',notice:'素材無法載入，已停止開始。請保留本頁並檢查本機檔案。'};
 if(action==='start'){
  if(state.phase!=='intro'||state.assets!=='ready')return state;
  return {...state,phase:'battle',index:0,initializations:1,records:QUESTIONS.map(q=>({questionId:q.id,first:null,attempts:[],completed:false,corrected:false})),notice:'先想好再作答，不限時間。'};
 }
 if(action==='next'){
  if(state.phase!=='battle'||!state.records[state.index]?.completed)return state;
  const s=structuredClone(state);
  if(s.index<9){s.index++;s.notice='先想好再作答，不限時間。';return s;}
  if(score(s).firstCount!==10||score(s).completed!==10)throw Error('cannot-finish-before-ten');
  s.phase=s.heroHP>=7?'victory':'defeat';s.notice=s.phase==='victory'?'救援成功！十題封印已破解。':'救援失敗。先補強觀念，再準備下一次挑戰。';return s;
 }
 if(action==='ending-finished')return ['victory','defeat'].includes(state.phase)?{...state,endingPlayed:true}:state;
 if(action==='restart')return ['victory','defeat'].includes(state.phase)?{...createBattle(),assets:state.assets}:state;
 return state;
}
