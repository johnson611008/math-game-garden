import{FormalCart,chargeClock as legacyCharge}from'./world.mjs';
import{BREAK_MS}from'../crystal-cart-demo/model.mjs';
import{judgeAnswer}from'./questions.mjs';
export class FeedbackCart extends FormalCart{
 constructor(seed,deck){super(seed,deck);for(const r of this.records)Object.assign(r,{wrongCount:0,answerRevealed:false,correctionStatus:'none',animationEvents:[],corrections:[]});}
 fault(reason){if(['correct','finished','correction'].includes(this.phase))return false;const r=this.record,reveal=reason==='timeout'||r.wrongCount>=2;
  if(this.effect&&['breaking','hint'].includes(this.phase)){if(this.effect.reveal||!reveal)return false;const prior=r.animationEvents.find(a=>a.id===this.effect.id);if(prior&&prior.status==='playing')prior.status='superseded';}
  const live=this.crystals.find(c=>c.answer===this.task.answer),source=reveal?(live||this.lastCorrectCrystal||this.plannedCorrect):this.caughtWrong;
  this.effect={id:++this.effectSerial,sourceId:source?.id??null,synthetic:!live,answer:reveal?this.task.answer:null,reveal,colorIndex:(source?.id??this.serial+1)%4,elapsed:0,reason};
  r.animationEvents.push({id:this.effect.id,kind:reveal?'revealed-fracture':'anonymous-fracture',status:'playing'});r.answerRevealed||=reveal;if(reveal)r.correctionStatus='required';
  this.phase='breaking';this.lastCause=reason;this.crystals=[];this.direction=0;return true;
 }
 catch(id){if(this.phase!=='falling'||this.remainingMs<=0)return false;const c=this.crystals.find(c=>c.id===id);if(!c)return false;const result=judgeAnswer(this.task,c.answer);if(!result.consumesFirst)throw Error('invalid-answer');const r=this.record,correct=result.accepted;
  r.attempts.push({answer:c.answer,correct,kind:r.first?'correction':'first',atMs:30000-this.remainingMs});if(!r.first)r.first={kind:'selection',answer:c.answer,correct};
  if(correct){r.completed=true;if(r.first.correct!==true)r.correctionStatus='completed';this.phase='correct';this.collected={...c};this.crystals=[];this.direction=0;}else{r.wrongCount++;this.caughtWrong={...c};this.fault('wrong');}return correct;
 }
 expire(reason='deadline'){const r=this.record;if(r.completed||r.timedOut)return;this.remainingMs=0;r.elapsedMs=30000;r.timedOut=true;r.timeoutReason=reason;if(!r.first)r.first={kind:'timeout',correct:null,reason};this.fault('timeout');}
 tick(dt){if(this.phase==='correction')return;super.tick(dt);const a=this.record.animationEvents.find(a=>a.id===this.effect?.id);if(a&&this.effect.elapsed>=BREAK_MS&&a.status==='playing')a.status='completed';if(this.record.answerRevealed&&['falling','timeout'].includes(this.phase)){this.phase='correction';this.remainingMs=Math.max(0,this.remainingMs);this.crystals=[];this.direction=0;}}
 correctAnswer(answer){if(this.phase!=='correction')throw Error('correction-not-ready');const result=judgeAnswer(this.task,answer);this.record.corrections.push({answer,result});if(result.accepted){this.record.completed=true;this.record.correctionStatus='completed';this.phase='correct';}return result;}
 static restore(seed,deck,snapshot){const w=new FeedbackCart(seed,deck);Object.assign(w,structuredClone(snapshot));return w;}
}
export function chargeClock(w,deadline,at,reason='background'){legacyCharge(w,deadline,at,reason);}
