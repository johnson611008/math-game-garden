import {Workshop,W,H,R,DT,layout,sweep} from '../physics.js';
export {W,H,R,DT};
export const BASE_SPEED=440,MAX_SPEED=680,PADDLE_SPEED=1050,PADDLE_Y=704,PADDLE_WIDTH=128,MAX_ANGLE=65*Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class PaddleWorkshop extends Workshop{
 constructor(blocks=layout()){super(blocks);this.paddle={x:360,target:360,y:PADDLE_Y,w:PADDLE_WIDTH,h:18,direction:0};this.phase='ready';this.resumePhase=null;this.lives=3;this.rallyBreaks=0;this.serial=0;Object.assign(this.metrics,{catches:0,misses:0});}
 emit(e){super.emit({...e,seq:++this.serial});}
 origin(){return {x:this.paddle.x,y:this.paddle.y-R-1};}
 setTarget(x){if(!Number.isFinite(x)||!['ready','playing'].includes(this.phase))return;this.paddle.target=clamp(x,20+this.paddle.w/2,W-20-this.paddle.w/2);}
 setDirection(direction){this.paddle.direction=['ready','playing'].includes(this.phase)?clamp(direction,-1,1):0;}
 aim(x,y){const o=this.origin();this.angle=clamp(Math.atan2(x-o.x,Math.max(30,o.y-y)),-1.25,1.25);}
 launch(){if(this.phase!=='ready'||this.ball||!this.blocks.some(b=>b.alive&&b.type!=='crate'))return false;this.ball={...this.origin(),vx:Math.sin(this.angle)*BASE_SPEED,vy:-Math.cos(this.angle)*BASE_SPEED};this.phase='playing';this.shots++;this.emit({type:'launch'});return true;}
 pause(){if(!['ready','playing'].includes(this.phase))return false;this.resumePhase=this.phase;this.phase='paused';this.stopInput();this.emit({type:'pause'});return true;}
 resume(){if(this.phase!=='paused')return false;this.phase=this.resumePhase;this.resumePhase=null;this.stopInput();this.emit({type:'resume'});return true;}
 stopInput(){this.paddle.direction=0;this.paddle.target=this.paddle.x;}
 update(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid time');if(this.phase==='paused'||this.phase==='won'||this.phase==='game-over')return;super.update(seconds);}
 speed(){return Math.min(MAX_SPEED,BASE_SPEED+this.rallyBreaks*5.5);}
 normalizeSpeed(){if(!this.ball)return;const n=Math.hypot(this.ball.vx,this.ball.vy);if(n>0){this.ball.vx=this.ball.vx/n*this.speed();this.ball.vy=this.ball.vy/n*this.speed();}}
 destroy(b,parent=null){const was=b.alive;super.destroy(b,parent);if(was&&!b.alive){this.rallyBreaks++;this.normalizeSpeed();if(!this.blocks.some(x=>x.alive&&x.type!=='crate')){this.ball=null;this.phase='won';this.stopInput();this.emit({type:'win'});}}}
 bounce(offset,x){const a=clamp(offset,-1,1)*MAX_ANGLE,s=this.speed();this.ball.vx=Math.sin(a)*s;this.ball.vy=-Math.cos(a)*s;this.ball.y=this.paddle.y-R-.02;this.metrics.catches++;this.emit({type:'paddle',x,y:this.ball.y,offset:clamp(offset,-1,1)});}
 step(){
  if(!['ready','playing'].includes(this.phase))return;
  const p=this.paddle,start=p.x;
  if(p.direction){p.x=clamp(p.x+p.direction*PADDLE_SPEED*DT,20+p.w/2,W-20-p.w/2);p.target=p.x;}
  else p.x+=clamp(p.target-p.x,-PADDLE_SPEED*DT,PADDLE_SPEED*DT);
  const pv=(p.x-start)/DT,ball=this.ball;
  // Reuse A's clock, flashes and causal chain queue without allowing its free-return rule to run.
  this.ball=null;super.step();if(this.phase==='won')return;this.ball=ball;if(!ball)return;this.normalizeSpeed();
  let left=DT;
  for(let i=0;i<8&&left>1e-8;i++){
   let best=null,target=null;
   const consider=(hit,b)=>{if(hit&&hit.t>=-.000001&&hit.t<=left&&(!best||hit.t<best.t)){best=hit;target=b;}};
   if(ball.vx<0)consider({t:(20+R-ball.x)/ball.vx,nx:1,ny:0},'wall');
   if(ball.vx>0)consider({t:(W-20-R-ball.x)/ball.vx,nx:-1,ny:0},'wall');
   if(ball.vy<0)consider({t:(28+R-ball.y)/ball.vy,nx:0,ny:1},'wall');
   for(const b of this.blocks)if(b.alive)consider(sweep(ball,b,left),b);
   // Analytic moving top-face sweep: no underside catches, and paddle movement is included at impact time.
   if(ball.vy>0&&ball.y<=p.y-R+.001){const t=(p.y-R-ball.y)/ball.vy,cx=start+pv*(DT-left+t),bx=ball.x+ball.vx*t;
    if(bx>=cx-p.w/2-R&&bx<=cx+p.w/2+R)consider({t,nx:0,ny:-1,cx},'paddle');}
   if(!best){ball.x+=ball.vx*left;ball.y+=ball.vy*left;break;}
   const t=Math.max(0,best.t);ball.x+=ball.vx*t;ball.y+=ball.vy*t;left-=t;
   if(target==='paddle')this.bounce((ball.x-best.cx)/(p.w/2),ball.x);
   else{if(best.nx)ball.vx=-ball.vx;if(best.ny)ball.vy=-ball.vy;ball.x+=best.nx*.02;ball.y+=best.ny*.02;
    if(target==='wall'){this.metrics.walls++;this.emit({type:'wall',x:ball.x,y:ball.y});}else this.hit(target);}
   if(this.phase==='won')return;
  }
  if(ball.y>H+R){this.ball=null;this.lives--;this.rallyBreaks=0;this.metrics.misses++;this.metrics.returns++;this.phase=this.lives>0?'ready':'game-over';this.stopInput();this.emit({type:'miss',lives:this.lives});}
 }
 trace(){const o=this.origin();
  // Keep the same swept prediction while the launcher's origin moves; walls stay fixed.
  const p={...o,vx:Math.sin(this.angle)*BASE_SPEED,vy:-Math.cos(this.angle)*BASE_SPEED},points=[{...o}];let duration=1.15;
  for(let i=0;i<4&&duration>0;i++){let best=null,kind=null;const consider=(h,k)=>{if(h&&h.t>=0&&h.t<=duration&&(!best||h.t<best.t)){best=h;kind=k;}};
   if(p.vx<0)consider({t:(20+R-p.x)/p.vx,nx:1,ny:0},'wall');if(p.vx>0)consider({t:(W-20-R-p.x)/p.vx,nx:-1,ny:0},'wall');if(p.vy<0)consider({t:(28+R-p.y)/p.vy,nx:0,ny:1},'wall');
   for(const b of this.blocks)if(b.alive)consider(sweep(p,b,duration),'brick');const t=best?.t??duration;p.x+=p.vx*t;p.y+=p.vy*t;points.push({x:p.x,y:p.y});duration-=t;if(!best||kind==='brick')break;if(best.nx)p.vx=-p.vx;if(best.ny)p.vy=-p.vy;p.x+=best.nx*.02;p.y+=best.ny*.02;
  }return points;
 }
 snapshot(){return {...super.snapshot(),paddle:structuredClone(this.paddle),phase:this.phase,resumePhase:this.resumePhase,lives:this.lives,rallyBreaks:this.rallyBreaks,speed:this.speed(),origin:this.origin()};}
}
