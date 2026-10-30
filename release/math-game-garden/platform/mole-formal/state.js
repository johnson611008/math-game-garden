import {buildQuestions,validateQuestions,BANK_VERSION,judge} from './questions.js';
export const CONTRACT='mole15-v1';
export function summary(s){const a=Object.values(s.records);return {firstCorrect:a.filter(r=>r.first.accepted).length,corrected:a.filter(r=>r.corrected).length,resolved:a.filter(r=>r.resolved).length,firstCount:a.length,bestCombo:s.bestCombo};}
export function startRound(id,seed,at,bankVersion=BANK_VERSION){return {contract:CONTRACT,bankVersion,id,seed,at,questions:buildQuestions(seed,bankVersion),index:0,phase:'thinking',resumePhase:null,unlocked:1,records:{},events:[],combo:0,bestCombo:0,settlement:null};}
export function apply(s,e){s=structuredClone(s);if(!e?.id||!e.at)throw Error('事件缺少識別');const old=s.events.find(x=>x.id===e.id);if(old){if(JSON.stringify(old)!==JSON.stringify(e))throw Error('事件識別衝突');return s;}if(s.phase==='settled')throw Error('已結算，僅供回顧');
 const q=s.questions[s.index];
 switch(e.type){
 case 'pause':if(!['thinking','choosing','stage-complete','awaiting-settlement'].includes(s.phase))throw Error('目前不能暫停');s.resumePhase=s.phase;s.phase='paused';break;
 case 'resume':if(s.phase!=='paused')throw Error('非暫停狀態');s.phase=s.resumePhase;s.resumePhase=null;break;
 case 'ready':if(s.phase!=='thinking')throw Error('請先閱讀題目');s.phase='choosing';break;
 case 'choose':{
 if(s.phase!=='choosing'||e.questionId!==q.id||!Number.isInteger(e.hole)||e.hole<0||e.hole>2)throw Error('不是目前可提交的題目');
 const o=q.options[e.hole],v=judge(q,o);if(!v.consumesFirst)throw Error('無效選項');const r=s.records[q.id]||{first:null,attempts:[],resolved:false,corrected:false};const a={eventId:e.id,answer:o.expression,hole:e.hole,accepted:v.accepted,concept:o.concept,result:v};const first=!r.first;r.attempts.push(a);if(first)r.first=structuredClone(a);
 if(v.accepted){r.resolved=true;r.corrected=!r.first.accepted;if(first)s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.phase='correct-feedback';}else{s.combo=0;s.phase='wrong-feedback';}s.records[q.id]=r;break;}
 case 'reaction-end':if(s.phase==='wrong-feedback')s.phase='choosing';else if(s.phase==='correct-feedback'){if(s.index===14)s.phase='awaiting-settlement';else if((s.index+1)%3===0){s.unlocked=Math.max(s.unlocked,q.stage+1);s.phase='stage-complete';}else{s.index++;s.phase='thinking';}}else throw Error('沒有待完成回饋');break;
 case 'next-stage':if(s.phase!=='stage-complete'||s.unlocked!==q.stage+1)throw Error('尚未解鎖');s.index++;s.phase='thinking';break;
 case 'settle':if(s.phase!=='awaiting-settlement'||summary(s).resolved!==15)throw Error('請先完成必要訂正');{const t=summary(s),thresholdMet=t.firstCorrect>=12;s.settlement={at:e.at,thresholdMet,officiallyCompleted:true,passed:thresholdMet,needsRemediation:!thresholdMet};s.phase='settled';}break;
 default:throw Error('不支援事件');
 }s.events.push(structuredClone(e));return s;
}
export function validateRound(s){if(s.contract!==CONTRACT||!['mole-bank-1',BANK_VERSION].includes(s.bankVersion))throw Error('不相容版本，禁止覆寫');validateQuestions(s.questions,s.seed,s.bankVersion);let rebuilt=startRound(s.id,s.seed,s.at,s.bankVersion);for(const e of s.events)rebuilt=apply(rebuilt,e);if(JSON.stringify(rebuilt)!==JSON.stringify(s))throw Error('事件與快照不一致');return s;}
