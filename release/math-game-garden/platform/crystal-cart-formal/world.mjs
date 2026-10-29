import{CartRound,QUESTION_MS,LANES}from'../crystal-cart-demo/model.mjs';
import{BANK,choices}from'./questions.mjs';
export{QUESTION_MS,LANES};
export function makePlan(seed){return BANK.map(q=>({...structuredClone(q),options:choices(q,seed)}));}
export class FormalCart extends CartRound{
 constructor(seed,deck=makePlan(seed)){super(seed);this.deck=deck;this.records=deck.map(q=>({id:q.id,first:null,attempts:[],misses:0,completed:false,timedOut:false,timeoutReason:null,interruptions:0,elapsedMs:0}));}
 get task(){return(this.deck||BANK)[this.index];}
 planWave(){this.wave++;if(this.wave>1)this.correctSlot=3-this.correctSlot;const answers=this.shuffle(this.task.options.filter(a=>a.answer!==this.task.answer).map(a=>a.answer));answers.splice(this.correctSlot,0,this.task.answer);this.plan=answers;this.plannedCorrect={id:this.serial+this.correctSlot+1,answer:this.task.answer};this.history.push({question:this.index,wave:this.wave,answers:[...answers],correctSlot:this.correctSlot,at:this.timeline});}
 next(){if(!['correct','timeout'].includes(this.phase))return false;if(this.index===this.deck.length-1){this.phase='finished';return true;}this.index++;this.x=.5;this.direction=0;this.begin();return true;}
 snapshot(){const{deck,...snapshot}=this;return structuredClone(snapshot);}
 static restore(seed,deck,snapshot){const w=new FormalCart(seed,deck);Object.assign(w,structuredClone(snapshot));return w;}
}
export function fitWorld(w,v){if(!v||!['width','height','windowWidth','windowHeight'].every(k=>Number.isFinite(v[k])&&v[k]>=100&&v[k]<=16384))throw Error('invalid-viewport');const cartW=Math.min(156,v.width*.24),cartH=cartW*97/156;w.cartHalf=cartW*.42/v.width;w.catchY=.88-cartH*.9/v.height;w.startY=Math.max(.25,(Math.min(96,v.windowWidth<=600?72:v.windowHeight*.1)+8)/v.height);const traverse=(LANES[3]-LANES[0])/.55*1000+350,separation=(Math.min(96,v.windowWidth<=600?72:v.windowHeight*.1)+44)/(.12*v.height)*1000/4;w.spawnMs=Math.ceil(Math.max(1700,traverse,separation)/100)*100;w.x=Math.max(w.cartHalf,Math.min(1-w.cartHalf,w.x));}
// Same R3 policy: absent time consumes the current question, with no background
// movement/catches. A persisted deadline prevents reload from renewing 30 seconds.
export function chargeClock(w,deadlineAtMs,atMs,reason='background'){if(['falling','breaking','hint'].includes(w.phase)&&w.remainingMs>0){w.remainingMs=Math.max(0,Math.min(w.remainingMs,deadlineAtMs-atMs));w.record.elapsedMs=QUESTION_MS-w.remainingMs;if(w.remainingMs===0)w.expire(reason);}}
