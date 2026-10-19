import {PaddleWorkshop,W,H,R,DT,PADDLE_SPEED} from '../a2/physics.js';
import {layout} from '../physics.js';
import {MathSession} from './math-session.js';
export {W,H,R,DT};
export function energyLayout(){const blocks=layout();const positions=[[6,1],[6,3],[6,5],[4,0],[4,7],[3,2],[3,5],[1,1],[1,6],[0,3]];positions.forEach(([row,col],i)=>{const b=blocks.find(b=>b.x===32+col*83&&b.y===88+row*63);b.energy='e'+(i+1);b.charge='empty';b.type='chain';b.hp=1;b.group=null;});return blocks;}
export class EnergyWorkshop extends PaddleWorkshop{
 constructor(blocks=energyLayout(),seed=1){super(blocks);this.session=new MathSession(seed);this.math=this.session.state;this.pendingEnergy=null;this.frozen=null;this.recoveryReturn='playing';}
 // Interrupt only at the fixed-step boundary, retaining the ordinary physical rebound.
 hit(b){if(!b.energy)return super.hit(b);if(b.charge==='failed'){b.charge='spent';return super.hit(b);}if(b.charge==='empty'){b.flash=.18;this.metrics.hits++;if(!this.pendingEnergy)this.pendingEnergy=b.id;return;}
  if(b.charge==='charged'){b.charge='spent';super.hit(b);for(const other of this.blocks){if(!other.alive||other.type==='crate'||other.energy||other.queued)continue;const dx=(other.x+other.w/2)-(b.x+b.w/2),dy=(other.y+other.h/2)-(b.y+b.h/2);if(Math.hypot(dx,dy)<=180){other.queued=true;this.queue.push({id:other.id,parent:b.id,at:this.clock+.14});this.emit({type:'chain-link',from:b.id,to:other.id,x:b.x+b.w/2,y:b.y+b.h/2,tx:other.x+other.w/2,ty:other.y+other.h/2});}}this.emit({type:'energy-burst',id:b.id});}
 }
 destroy(b,parent=null){if(b.energy&&b.charge!=='spent')return;super.destroy(b,parent);}
 step(){if(this.math.active)return;super.step();if(this.pendingEnergy){const b=this.blocks.find(b=>b.id===this.pendingEnergy);this.pendingEnergy=null;if(this.phase!=='playing'||!this.ball)return;this.openEnergy(b.id);}}
 openEnergy(brickId,returnPhase='playing'){if(!['playing','won','game-over'].includes(returnPhase)||this.phase!==returnPhase||this.math.active||(brickId!==null&&!this.blocks.some(b=>b.id===brickId&&b.energy&&b.charge==='empty'))||!this.session.start(brickId))return false;this.recoveryReturn=returnPhase;this.phase='math';this.stopInput();this.emit({type:'energy-open',id:brickId});this.frozen=structuredClone({ball:this.ball,paddle:this.paddle,clock:this.clock,queue:this.queue,blocks:this.blocks,lives:this.lives});return true;}
 finishRemaining(){if(!['won','game-over'].includes(this.phase)||this.math.officialCount>=10)return false;const b=this.blocks.find(b=>b.energy&&b.charge==='empty');return this.openEnergy(b?.id??null,this.phase);}
 update(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid time');if(this.math.active)return;if(this.phase==='recovering'){const p=this.paddle,dt=Math.min(seconds,.1),clamp=x=>Math.max(20+p.w/2,Math.min(W-20-p.w/2,x));if(p.direction){p.x=clamp(p.x+p.direction*PADDLE_SPEED*dt);p.target=p.x;}else p.x+=Math.max(-PADDLE_SPEED*dt,Math.min(PADDLE_SPEED*dt,p.target-p.x));return;}super.update(seconds);}
 setTarget(x){if(this.phase==='recovering'&&Number.isFinite(x)){this.paddle.target=Math.max(20+this.paddle.w/2,Math.min(W-20-this.paddle.w/2,x));return;}super.setTarget(x);}
 setDirection(d){if(this.phase==='recovering'){this.paddle.direction=Math.max(-1,Math.min(1,d));return;}super.setDirection(d);}
 choose(index,questionId){if(this.phase!=='math')return {accepted:false};const result=this.session.answer(questionId,index);if(result.accepted&&result.taskFinished){const b=this.blocks.find(b=>b.id===this.session.task.brickId);if(b)b.charge=result.correct?'charged':'failed';this.emit({type:result.correct?'energy-charged':'energy-failed',id:b?.id??null});}return result;}
 continueEnergy(){if(!this.session.close())return false;this.phase='recovering';this.stopInput();return true;}
 resumeBall(){if(this.phase!=='recovering')return false;this.stopInput();this.phase=this.recoveryReturn;this.frozen=null;return true;}
 chooseOnce(index,questionId){return this.choose(index,questionId);}
 pause(){if(this.math.active)return false;if(this.phase==='recovering'){this.resumePhase='recovering';this.phase='paused';this.stopInput();this.emit({type:'pause'});return true;}return super.pause();}
 snapshot(){const s=super.snapshot();return {...s,prototypeVersion:'WP08-B-R2',math:this.session.snapshot(),frozen:structuredClone(this.frozen),recoveryReturn:this.recoveryReturn,operationStatus:s.complete?'cleared':this.lives===0?'failed':'in-progress',fullPass:s.complete&&this.math.status==='passed'&&this.math.completed===10&&!this.math.active};}
}
