// Presentation only: no questions, scores, timer, storage, or learning records.
export class MoleAnimation{
 constructor(random=Math.random){this.random=random;this.running=false;this.phase='ready';this.time=0;this.hole=-1;this.bag=[];this.impacts=0;this.completed=0;}
 next(){if(!this.bag.length){this.bag=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag[0]===this.hole)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];}this.hole=this.bag.shift();this.phase='emerge';this.time=0;}
 start(){this.running=true;this.bag=[];this.hole=-1;this.impacts=0;this.completed=0;this.next();}
 hit(){if(!this.running||!['emerge','wait'].includes(this.phase)||this.visible()<.6)return false;this.phase='windup';this.time=0;this.impacts++;return true;}
 visible(){return this.phase==='emerge'?1-Math.pow(1-Math.min(1,this.time/.48),3):this.phase==='retreat'?1-Math.pow(Math.min(1,this.time/.55),1.6):['ready','cooldown'].includes(this.phase)?0:1;}
 pose(){if(this.phase==='windup')return 'surprise';if(this.phase==='hit'||this.phase==='dizzy')return 'hit';if(this.phase==='retreat'&&this.time/.55>.68)return 'exit';if(this.phase==='emerge')return 'peek';if(this.phase==='wait'){const t=this.time;if(t>.8&&t<.95||t>3.35&&t<3.5)return 'smile';if(t>1.35&&t<2)return 'left';if(t>2.2&&t<2.85)return 'right';}return 'idle';}
 tick(dt){if(!this.running)return;this.time+=Math.min(.08,Math.max(0,dt));const duration={emerge:.48,wait:4.5,windup:.09,hit:.22,dizzy:.95,retreat:.55,cooldown:.4}[this.phase];if(this.time<duration)return;const next={emerge:'wait',wait:'retreat',windup:'hit',hit:'dizzy',dizzy:'retreat',retreat:'cooldown'}[this.phase];if(this.phase==='cooldown'){this.next();return;}if(this.phase==='retreat')this.completed++;this.phase=next;this.time=0;}
}
