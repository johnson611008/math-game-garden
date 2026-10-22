// WP10-A: pure, deterministic hex-grid bubble game. No learning or storage dependencies.
import {advancePressure,pressureInfo} from './descent.js';
export const W=600,H=800,R=24,ROW=Math.sqrt(3)*R,TOP=76,LEFT=36,RIGHT=564,FAIL=612;
export const LAUNCH={x:300,y:706},SPEED=760,STEP=1/120;
export const key=(r,c)=>`${r}:${c}`;
export function rng(seed=1){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function cell(r,c,offset=0){return {x:60+c*48+(r%2)*24,y:TOP+r*ROW+offset};}
export function valid(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<22&&c>=0&&c<(r%2?10:11);}
export function neighbors(r,c){return [[r,c-1],[r,c+1],[r-1,c+(r%2?0:-1)],[r-1,c+(r%2?1:0)],[r+1,c+(r%2?0:-1)],[r+1,c+(r%2?1:0)]].filter(([r,c])=>valid(r,c));}
export function aim(x,y){let dx=x-LAUNCH.x,dy=Math.min(-90,y-LAUNCH.y);const angle=Math.max(-1.23,Math.min(1.23,Math.atan2(dx,-dy)));return {x:Math.sin(angle),y:-Math.cos(angle)};}
export class BubbleGame{
 constructor(seed=Date.now()){this.reset(seed);}
 reset(seed=this.seed){this.seed=seed;this.random=rng(seed);this.grid=new Map();this.offset=0;this.shots=0;this.drops=0;this.completedShots=0;this.pressureUnits=0;this.resolvedShot=0;this.elapsed=0;this.accumulator=0;this.ball=null;this.paused=false;this.status='ready';this.last=null;this.serial=0;
  for(let r=0;r<6;r++)for(let c=0;c<(r%2?10:11);c++)this.put(r,c,(Math.floor(c/2)+Math.floor(r/2))%4);
  this.current=this.pick();this.next=this.pick();return this;
 }
 put(r,c,color){if(!valid(r,c)||!Number.isInteger(color)||color<0||color>3)throw Error('invalid bubble');this.grid.set(key(r,c),{r,c,color});}
 pick(){const colors=[...new Set([...this.grid.values()].map(b=>b.color))];return colors.length?colors[Math.floor(this.random()*colors.length)]:0;}
 start(){if(this.status!=='ready')return false;this.status='playing';return true;}
 pause(){if(this.status!=='playing')return false;this.paused=!this.paused;this.accumulator=0;return true;}
 shoot(direction){if(this.status!=='playing'||this.paused||this.ball)return false;const d=aim(LAUNCH.x+direction.x*500,LAUNCH.y+direction.y*500);this.ball={...LAUNCH,vx:d.x*SPEED,vy:d.y*SPEED,color:this.current};this.shots++;this.current=this.next;this.next=this.pick();return true;}
 // Sweep a segment against expanded bubble circles: prevents tunnelling at any frame rate.
 collision(x,y,dx,dy){let best=null;const a=dx*dx+dy*dy;if(a===0)return null;for(const b of this.grid.values()){const p=cell(b.r,b.c,this.offset),ox=x-p.x,oy=y-p.y,bb=2*(ox*dx+oy*dy),cc=ox*ox+oy*oy-(2*R-.2)**2,disc=bb*bb-4*a*cc;if(disc<0)continue;const t=(-bb-Math.sqrt(disc))/(2*a);if(t>=-1e-7&&t<=1&&(!best||t<best.t))best={t:Math.max(0,t),bubble:b};}return best;}
 move(dt){const b=this.ball;if(!b)return;let remaining=dt;for(let i=0;i<4&&remaining>1e-8&&this.ball;i++){const dx=b.vx*remaining,dy=b.vy*remaining;let t=1,kind=null,hit=null;
   if(dx<0&&b.x+dx<LEFT+R){t=(LEFT+R-b.x)/dx;kind='wall';}if(dx>0&&b.x+dx>RIGHT-R){t=(RIGHT-R-b.x)/dx;kind='wall';}
   if(dy<0&&b.y+dy<TOP+this.offset){const top=(TOP+this.offset-b.y)/dy;if(top<=t){t=top;kind='top';}}
   const c=this.collision(b.x,b.y,dx,dy);if(c&&c.t<=t){t=c.t;kind='bubble';hit=c.bubble;}
   b.x+=dx*t;b.y+=dy*t;remaining*=1-t;
   if(kind==='wall'){b.vx=-b.vx;continue;}if(kind==='top'||kind==='bubble'){this.attach(hit);break;}break;
  }
 }
 attach(hit){const b=this.ball;if(!b)return;const options=hit?neighbors(hit.r,hit.c):Array.from({length:11},(_,c)=>[0,c]);const available=options.filter(([r,c])=>!this.grid.has(key(r,c)));available.sort((a,z)=>{const p=cell(...a,this.offset),q=cell(...z,this.offset);return (p.x-b.x)**2+(p.y-b.y)**2-((q.x-b.x)**2+(q.y-b.y)**2);});
  if(!available.length){this.ball=null;this.status='lost';this.last={id:++this.serial,popped:[],fallen:[],blocked:true};return;}
  const [r,c]=available[0];this.put(r,c,b.color);this.ball=null;this.resolve(r,c);
 }
 flood(start,predicate){const seen=new Set(),todo=[...start];while(todo.length){const k=todo.pop();if(seen.has(k))continue;const b=this.grid.get(k);if(!b||!predicate(b))continue;seen.add(k);for(const [r,c]of neighbors(b.r,b.c))todo.push(key(r,c));}return seen;}
 resolve(r,c){const color=this.grid.get(key(r,c)).color;const group=this.flood([key(r,c)],b=>b.color===color);const popped=[],fallen=[];
  if(group.size>=3){for(const k of group){popped.push({...this.grid.get(k),...cell(this.grid.get(k).r,this.grid.get(k).c,this.offset)});this.grid.delete(k);}const supported=this.flood([...this.grid.values()].filter(b=>b.r===0).map(b=>key(b.r,b.c)),()=>true);for(const [k,b]of this.grid)if(!supported.has(k)){fallen.push({...b,...cell(b.r,b.c,this.offset)});this.grid.delete(k);}}
  let descent=false;if(this.shots>this.resolvedShot){const pressure=advancePressure(this.completedShots,this.pressureUnits);this.completedShots=pressure.completed;this.pressureUnits=pressure.units;this.resolvedShot=this.shots;descent=pressure.rows>0;if(descent&&this.grid.size){this.offset+=pressure.rows*ROW;this.drops+=pressure.rows;}}
  this.last={id:++this.serial,popped,fallen,attached:{r,c,color},descent};
  if(this.grid.size===0)this.status='won';else if([...this.grid.values()].some(b=>cell(b.r,b.c,this.offset).y+R>=FAIL))this.status='lost';
  const colors=new Set([...this.grid.values()].map(b=>b.color));if(!colors.has(this.current))this.current=this.pick();if(!colors.has(this.next))this.next=this.pick();
 }
 update(seconds){if(this.status!=='playing'||this.paused)return;this.accumulator+=Math.min(.1,Math.max(0,seconds));while(this.accumulator+1e-9>=STEP){this.elapsed+=STEP;this.move(STEP);this.accumulator-=STEP;}}
 preview(direction){let x=LAUNCH.x,y=LAUNCH.y,dx=direction.x,dy=direction.y;const points=[{x,y}];for(let i=0;i<75;i++){let nx=x+dx*8,ny=y+dy*8;if(nx<LEFT+R||nx>RIGHT-R){dx=-dx;nx=x+dx*8;}const hit=this.collision(x,y,nx-x,ny-y);if(hit||ny<=TOP+this.offset){points.push({x:hit?x+(nx-x)*hit.t:nx,y:hit?y+(ny-y)*hit.t:TOP+this.offset});break;}x=nx;y=ny;if(i%3===0)points.push({x,y});}return points;}
 get descentInfo(){return pressureInfo(this.completedShots,this.pressureUnits);}
 snapshot(){return {status:this.status,paused:this.paused,seed:this.seed,shots:this.shots,completedShots:this.completedShots,pressureUnits:this.pressureUnits,resolvedShot:this.resolvedShot,drops:this.drops,offset:this.offset,elapsed:this.elapsed,ball:this.ball&&{...this.ball},grid:[...this.grid.values()].map(b=>({...b})),last:this.last};}
}
