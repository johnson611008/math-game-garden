import{noteCollision,inspectTrap,holdOverlap}from './anti-trap.js';
import {EnergyWorkshop} from '../marble-demo/b/physics.js';
import {PaddleWorkshop,W,H,R,DT} from '../marble-demo/a2/physics.js';
import {stages,stageLayout} from './stages.js';
export {W,H,R,DT};
const FIELDS=['ball','angle','blocks','clock','accumulator','events','queue','shots','metrics','paddle','phase','resumePhase','lives','rallyBreaks','serial','pendingEnergy','frozen','recoveryReturn','math'];
export class StageWorld extends PaddleWorkshop{
 constructor(index,slots,snapshot=null){super(stageLayout(index));this.stageIndex=index;this.config=stages[index];this.slots=slots;this.math={active:null};this.paddle.w=this.config.width;this.pendingEnergy=null;this.frozen=null;this.recoveryReturn='playing';
  for(const b of this.blocks)if(b.energy){const outcome=slots[b.energy]?.outcome;b.charge=outcome==='success'?'charged':outcome==='failed'?'failed':'empty';}
  if(snapshot)for(const k of FIELDS)if(k in snapshot)this[k]=structuredClone(snapshot[k]);
 }
 speed(){return Math.min(650,this.config.speed+this.rallyBreaks*4);}
 launch(){const ok=PaddleWorkshop.prototype.launch.call(this);if(ok)this.normalizeSpeed();return ok;}
 openEnergy(brickId){const b=this.blocks.find(b=>b.id===brickId);if(this.phase!=='playing'||!b?.energy||this.math.active||!['unstarted','pending'].includes(this.slots[b.energy].outcome))return false;this.math.active=b.energy;this.recoveryReturn='playing';this.phase='math';this.stopInput();this.emit({type:'energy-open',id:brickId});this.frozen={ball:structuredClone(this.ball),clock:this.clock};return true;}
 finishRemaining(){return false;}
 choose(){throw Error('formal-answer-requires-transaction');}
 chooseOnce(){return this.choose();}
 snapshot(){return Object.fromEntries(FIELDS.map(k=>[k,structuredClone(this[k])]));}
}
// Reuse the verified B/R1 physics behaviours; formal scoring is exclusively transactional.
for(const name of ['hit','destroy','step','update','setTarget','setDirection','pause','resumeBall'])StageWorld.prototype[name]=EnergyWorkshop.prototype[name];

const originalHit=StageWorld.prototype.hit,originalStep=StageWorld.prototype.step;
StageWorld.prototype.hit=function(b){noteCollision(this,b);return originalHit.call(this,b)};
StageWorld.prototype.step=function(){if(holdOverlap(this))return;originalStep.call(this);inspectTrap(this)};
