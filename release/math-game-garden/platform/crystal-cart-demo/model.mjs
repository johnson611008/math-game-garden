import{TASKS,judge,value,validateBank}from'../alchemy-direct/model.mjs';
import{equivalent}from'../src/math/radical-value.js';
export const LANES=[.15,.3833333333,.6166666667,.85];
export const QUESTION_MS=30000,SPAWN_MS=1700,DROP_SPEED=.12,BREAK_MS=1600,HINT_MS=900;
export const OPTIONS=[
 ['5','6','3','2+sqrt(6)','2+2sqrt(3)','11'],
 ['2+2sqrt(2)','4sqrt(2)','4','2sqrt(2)','4+2sqrt(2)','6'],
 ['4sqrt(3)','3sqrt(3)','2sqrt(3)','6sqrt(3)','2sqrt(6)','3sqrt(2)'],
 ['9','3sqrt(3)','3sqrt(6)','27','9sqrt(3)','3'],
 ['2+3sqrt(2)','4+3sqrt(2)','2+sqrt(2)','5sqrt(2)','3sqrt(2)-2','6+3sqrt(2)']
];
export const MISCONCEPTIONS=[
 ['正解','將加二誤作乘二','漏加常數','根式乘法誤加根號內數字','根式乘法未消去根號','直接忽略根號'],
 ['正解','整數與根式錯誤合併','錯把根式項化為整數','漏掉乘積','乘積把根號值直接相乘','根式係數及整數混淆'],
 ['正解','平方因數提出錯誤','漏掉乘法項','未先乘後加而從左算到右','不同根式錯誤合併','加號錯放根號內'],
 ['正解','漏做括號外乘法','根式相乘錯加根號內數字','忽略根號後連乘','根號相乘後仍保留根號','漏掉括號中的係數項'],
 ['正解','漏做減二','根式化簡係數遺失','整數與根式錯誤合併','漏做乘法項','減法錯作加法']
];
export const display=s=>s.replaceAll('sqrt(','√').replaceAll(')','').replaceAll('+','＋').replaceAll('-','−');
export function validate(){const exact=validateBank();return TASKS.map((q,i)=>{const vs=OPTIONS[i].map(value);for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)if(equivalent(vs[a],vs[b]))throw Error('duplicate-option');if(vs.filter(v=>equivalent(v,value(q.expression))).length!==1)throw Error('invalid-options');return{id:q.id,expression:q.expression,answer:q.answer,exact:exact[i].exact,options:OPTIONS[i],misconceptions:MISCONCEPTIONS[i],unique:true};});}
validate();
export class CartRound{
 constructor(seed=Date.now()){this.seed=seed>>>0;this.index=0;this.x=.5;this.direction=0;this.cartHalf=.08;this.catchY=.79;this.startY=.25;this.spawnMs=SPAWN_MS;this.serial=0;this.effectSerial=0;this.history=[];this.records=TASKS.map(q=>({id:q.id,first:null,attempts:[],misses:0,completed:false,timedOut:false,timeoutReason:null,interruptions:0,elapsedMs:0}));this.begin();}
 get task(){return TASKS[this.index];}get record(){return this.records[this.index];}
 get correctCount(){return this.records.filter(r=>r.first?.correct===true).length;}
 random(){this.seed^=this.seed<<13;this.seed^=this.seed>>>17;this.seed^=this.seed<<5;this.seed>>>=0;if(!this.seed)this.seed=0x9e3779b9;return this.seed/4294967296;}
 shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 begin(){this.phase='falling';this.remainingMs=QUESTION_MS;this.crystals=[];this.wave=0;this.spawned=0;this.nextSpawn=0;this.timeline=0;this.effect=null;this.hintLeft=0;this.lastCause=null;this.hidden=false;this.laneOrder=this.shuffle([0,1,2,3]);this.correctSlot=1+Math.floor(this.random()*2);this.plan=[];this.lastCorrectCrystal=null;this.plannedCorrect=null;}
 planWave(){this.wave++;if(this.wave>1)this.correctSlot=3-this.correctSlot;const answers=this.shuffle(OPTIONS[this.index].filter(a=>a!==this.task.answer));answers.splice(this.correctSlot,0,this.task.answer);this.plan=answers;this.plannedCorrect={id:this.serial+this.correctSlot+1,answer:this.task.answer};this.history.push({question:this.index,wave:this.wave,answers:[...answers],correctSlot:this.correctSlot,at:this.timeline});}
 spawn(){if(this.phase!=='falling'||this.remainingMs<=0)return;const slot=this.spawned%6;if(slot===0)this.planWave();const answer=this.plan[slot],lane=this.laneOrder[this.spawned%4],c={id:++this.serial,answer,lane,x:LANES[lane],y:this.startY,spawnAt:this.timeline,wave:this.wave,slot};this.crystals.push(c);if(answer===this.task.answer)this.lastCorrectCrystal={...c};this.spawned++;this.nextSpawn=this.timeline+this.spawnMs;}
 move(dt){if(this.phase!=='falling')return;this.x=Math.max(this.cartHalf,Math.min(1-this.cartHalf,this.x+this.direction*.55*dt/1000));}
 fault(reason){if(['breaking','hint','timeout','correct','finished'].includes(this.phase))return false;const live=this.crystals.find(c=>c.answer===this.task.answer),source=live||this.lastCorrectCrystal||this.plannedCorrect;
 // R4 explicitly reveals the correct answer. Copies remain presentation-only:
 // they never return to the catch list or create an assessment event.
 this.effect={id:++this.effectSerial,sourceId:source?.id??null,synthetic:!live,answer:this.task.answer,colorIndex:(source?.id??this.serial+1)%4,elapsed:0,reason};this.phase='breaking';this.lastCause=reason;this.crystals=[];this.direction=0;return true;}
 expire(reason='deadline'){if(this.record.completed||this.record.timedOut)return;this.remainingMs=0;this.record.elapsedMs=QUESTION_MS;this.record.timedOut=true;this.record.timeoutReason=reason;if(!this.record.first)this.record.first=Object.freeze({kind:'timeout',correct:null,reason});if(this.effect&&['breaking','hint'].includes(this.phase)){this.effect.reason='timeout';this.lastCause='timeout';return;}this.fault('timeout');}
 catch(id){if(this.phase!=='falling'||this.remainingMs<=0)return false;const c=this.crystals.find(c=>c.id===id);if(!c)return false;const result=judge(this.task,c.answer);if(!result.consumesFirst)throw Error('invalid-answer');const correct=result.accepted,r=this.record;r.attempts.push({answer:c.answer,correct,kind:r.first?'correction':'first',atMs:QUESTION_MS-this.remainingMs});if(!r.first)r.first=Object.freeze({kind:'selection',answer:c.answer,correct});if(correct){r.completed=true;this.phase='correct';this.collected={...c};this.crystals=[];this.direction=0;}else this.fault('wrong');return correct;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0||this.hidden)return;while(dt>1e-7&&['falling','breaking','hint'].includes(this.phase)){
 const step=Math.min(10,dt);dt-=step;
 if(this.remainingMs>0){this.remainingMs=Math.max(0,this.remainingMs-Math.min(step,this.remainingMs));this.record.elapsedMs=QUESTION_MS-this.remainingMs;if(this.remainingMs<=1e-7){this.expire();continue;}}
 if(this.phase==='breaking'){this.effect.elapsed=Math.min(BREAK_MS,this.effect.elapsed+step);if(this.effect.elapsed>=BREAK_MS){this.phase='hint';this.hintLeft=HINT_MS;}continue;}
 if(this.phase==='hint'){this.hintLeft-=step;if(this.hintLeft<=0){if(this.record.timedOut)this.phase='timeout';else{this.phase='falling';this.effect=null;this.spawned=Math.ceil(this.spawned/6)*6;this.nextSpawn=this.timeline;}}continue;}
 this.move(step);this.timeline+=step;if(this.timeline>=this.nextSpawn)this.spawn();
 for(const c of [...this.crystals]){const old=c.y;c.y+=DROP_SPEED*step/1000;if(old<this.catchY&&c.y>=this.catchY&&Math.abs(c.x-this.x)<=this.cartHalf){this.catch(c.id);break;}if(c.y>1.10){this.record.misses++;this.crystals=this.crystals.filter(a=>a.id!==c.id);}}
 }}
 interrupt(){if(this.hidden)return;this.hidden=true;this.direction=0;this.record.interruptions++;}
 resumeAfterAbsence(ms){if(!this.hidden)return;this.hidden=false;if(!Number.isFinite(ms)||ms<0)ms=0;if(['falling','breaking','hint'].includes(this.phase)){this.remainingMs=Math.max(0,this.remainingMs-ms);this.record.elapsedMs=QUESTION_MS-this.remainingMs;if(this.remainingMs===0)this.expire('background');if(this.phase==='falling'){this.crystals=[];this.spawned=Math.ceil(this.spawned/6)*6;this.nextSpawn=this.timeline;}}}
 next(){if(!['correct','timeout'].includes(this.phase))return false;if(this.index===4){this.phase='finished';return true;}this.index++;this.x=.5;this.direction=0;this.begin();return true;}
}
