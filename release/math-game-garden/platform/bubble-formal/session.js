import {judge} from './questions.js';
export class SlotMath{
 constructor(plan,slots){this.plan=plan;this.slots=slots;this.activeId=null;}
 get task(){return this.slots[this.activeId]||null;}
 get question(){return this.task?.outcome==='pending'?this.plan[this.activeId][this.task.attempts.length]:null;}
 start(id){const t=this.slots[id];if(this.activeId||!t||t.outcome!=='unstarted')return false;t.outcome='pending';this.activeId=id;return true;}
 submit(qid,answer,eventId){const t=this.task,q=this.question;if(!q||q.id!==qid||Object.values(this.slots).some(s=>s.attempts.some(a=>a.eventId===eventId||a.questionId===qid)))return {accepted:false,code:'stale-or-duplicate'};const result=judge(q,answer);if(!result.consumesFirst)return {accepted:false,code:result.status};const record={eventId,questionId:qid,answer,correct:result.accepted,status:result.status,concept:q.concept,reasonCodes:result.reasonCodes,role:t.attempts.length?'supplement':'first'};t.attempts.push(record);t.first??=structuredClone(record);if(record.correct||t.attempts.length===3)t.outcome=record.correct?'success':'failed';return {accepted:true,correct:record.correct,status:record.status,taskFinished:t.outcome!=='pending',outcome:t.outcome};}
 close(){if(!this.task||this.task.outcome==='pending')return false;this.activeId=null;return true;}
 summary(){const tasks=Object.values(this.slots),first=tasks.filter(t=>t.first),extra=tasks.flatMap(t=>t.attempts.slice(1));return {firstAnswered:first.length,firstCorrect:first.filter(t=>t.first.correct).length,supplementAnswered:extra.length,supplementCorrect:extra.filter(a=>a.correct).length,success:tasks.filter(t=>t.outcome==='success').length,failed:tasks.filter(t=>t.outcome==='failed').length};}
 get state(){return {tasks:Object.values(this.slots)};}
 snapshot(){return {activeId:this.activeId};}
}
