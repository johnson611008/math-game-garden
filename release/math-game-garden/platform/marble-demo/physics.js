export const W=720,H=760,DT=1/240,R=9,SPEED=550,ORIGIN={x:360,y:690};
export function layout(){const blocks=[];let id=0;for(let row=0;row<7;row++)for(let col=0;col<8;col++){
 if((row===3&&(col===1||col===6))||(row===5&&(col===0||col===7)))continue;
 const type=row===4&&(col===1||col===6)?'crate':row===2&&col>=2&&col<=5?'chain':(row+col)%4===0?'ice':'stone';
 blocks.push({id:'brick-'+id++,x:32+col*83,y:88+row*63,w:76,h:48,type,hp:type==='ice'?2:type==='crate'?null:1,alive:true,queued:false,group:type==='chain'?'amber':null,flash:0});
 }return blocks;}
// Sweep a point through a radius-expanded rectangle. The small safe offset resolves contact.
export function sweep(ball,rect,seconds){const minX=rect.x-R,maxX=rect.x+rect.w+R,minY=rect.y-R,maxY=rect.y+rect.h+R;let near=-Infinity,far=Infinity,nx=0,ny=0;
 for(const [p,v,min,max,ax,ay] of [[ball.x,ball.vx,minX,maxX,1,0],[ball.y,ball.vy,minY,maxY,0,1]]){
  if(Math.abs(v)<1e-10){if(p<min||p>max)return null;continue;}let a=(min-p)/v,b=(max-p)/v,sign=-Math.sign(v);if(a>b)[a,b]=[b,a];if(a>near){near=a;nx=sign*ax;ny=sign*ay;}far=Math.min(far,b);if(near>far)return null;
 }if(near<-.000001||near>seconds||far<0)return null;return {t:Math.max(0,near),nx,ny};
}
export class Workshop{
 constructor(blocks=layout()){this.blocks=structuredClone(blocks);this.ball=null;this.angle=.12;this.clock=0;this.accumulator=0;this.events=[];this.queue=[];this.shots=0;this.metrics={walls:0,hits:0,broken:0,chains:0,returns:0};}
 emit(e){this.events.push({...e,at:this.clock});if(this.events.length>256)this.events.shift();}
 aim(x,y){this.angle=Math.max(-1.33,Math.min(1.33,Math.atan2(x-ORIGIN.x,Math.max(30,ORIGIN.y-y))));}
 launch(){if(this.ball||!this.blocks.some(b=>b.alive&&b.type!=='crate'))return false;this.ball={...ORIGIN,vx:Math.sin(this.angle)*SPEED,vy:-Math.cos(this.angle)*SPEED};this.shots++;this.emit({type:'launch'});return true;}
 destroy(b,parent=null){if(!b.alive||b.type==='crate')return;b.alive=false;b.queued=false;this.metrics.broken++;if(parent)this.metrics.chains++;this.emit({type:'break',id:b.id,kind:b.type,x:b.x+b.w/2,y:b.y+b.h/2,parent});if(b.group){for(const other of this.blocks){if(!other.alive||other.queued||other.group!==b.group||other.id===b.id)continue;const dx=Math.abs((other.x+other.w/2)-(b.x+b.w/2)),dy=Math.abs((other.y+other.h/2)-(b.y+b.h/2));if((dx<=Math.max(b.w,other.w)+10&&dy<8)||(dy<=Math.max(b.h,other.h)+16&&dx<8)){other.queued=true;this.queue.push({id:other.id,parent:b.id,at:this.clock+.14});this.emit({type:'chain-link',from:b.id,to:other.id,x:b.x+b.w/2,y:b.y+b.h/2,tx:other.x+other.w/2,ty:other.y+other.h/2});}}}}
 hit(b){b.flash=.18;this.metrics.hits++;this.emit({type:'hit',id:b.id,kind:b.type,x:b.x+b.w/2,y:b.y+b.h/2});if(b.type==='crate')return;if(b.queued)return;b.hp--;if(b.hp<=0)this.destroy(b);}
 update(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid time');this.accumulator+=Math.min(seconds,.25);while(this.accumulator+1e-10>=DT){this.step();this.accumulator-=DT;}}
 step(){this.clock+=DT;for(const b of this.blocks)b.flash=Math.max(0,b.flash-DT);const due=this.queue.filter(q=>q.at<=this.clock);this.queue=this.queue.filter(q=>q.at>this.clock);for(const q of due){const b=this.blocks.find(b=>b.id===q.id);if(b?.alive)this.destroy(b,q.parent);}
 const ball=this.ball;if(!ball)return;let left=DT;for(let i=0;i<6&&left>1e-8;i++){
  let collision=null,target=null;const consider=(hit,b)=>{if(hit&&(!collision||hit.t<collision.t)){collision=hit;target=b;}};
  if(ball.vx<0)consider({t:(20+R-ball.x)/ball.vx,nx:1,ny:0},'wall');if(ball.vx>0)consider({t:(W-20-R-ball.x)/ball.vx,nx:-1,ny:0},'wall');if(ball.vy<0)consider({t:(28+R-ball.y)/ball.vy,nx:0,ny:1},'wall');
  if(collision&&(collision.t<-.000001||collision.t>left)){collision=null;target=null;}
  for(const b of this.blocks)if(b.alive)consider(sweep(ball,b,left),b);
  if(!collision){ball.x+=ball.vx*left;ball.y+=ball.vy*left;break;}
  const time=Math.max(0,collision.t);ball.x+=ball.vx*time;ball.y+=ball.vy*time;left-=time;
  if(collision.nx)ball.vx=-ball.vx;if(collision.ny)ball.vy=-ball.vy;ball.x+=collision.nx*.01;ball.y+=collision.ny*.01;
  if(target==='wall'){this.metrics.walls++;this.emit({type:'wall',x:ball.x,y:ball.y});}else this.hit(target);
 }
 if(ball.y>H+R){this.ball=null;this.metrics.returns++;this.emit({type:'return'});}
 }
 trace(){const p={...ORIGIN,vx:Math.sin(this.angle)*SPEED,vy:-Math.cos(this.angle)*SPEED},points=[{x:p.x,y:p.y}];let duration=1.15;for(let i=0;i<4&&duration>0;i++){let best=null,kind=null;const consider=(hit,k)=>{if(hit&&hit.t>=0&&hit.t<=duration&&(!best||hit.t<best.t)){best=hit;kind=k;}};if(p.vx<0)consider({t:(20+R-p.x)/p.vx,nx:1,ny:0},'wall');if(p.vx>0)consider({t:(W-20-R-p.x)/p.vx,nx:-1,ny:0},'wall');if(p.vy<0)consider({t:(28+R-p.y)/p.vy,nx:0,ny:1},'wall');for(const b of this.blocks)if(b.alive)consider(sweep(p,b,duration),'brick');const t=best?.t??duration;p.x+=p.vx*t;p.y+=p.vy*t;points.push({x:p.x,y:p.y});duration-=t;if(!best||kind==='brick')break;if(best.nx)p.vx=-p.vx;if(best.ny)p.vy=-p.vy;p.x+=best.nx*.01;p.y+=best.ny*.01;}return points;}
 snapshot(){return structuredClone({ball:this.ball,angle:this.angle,blocks:this.blocks,clock:this.clock,shots:this.shots,queue:this.queue,events:this.events,metrics:this.metrics,complete:!this.blocks.some(b=>b.alive&&b.type!=='crate')});}
}
