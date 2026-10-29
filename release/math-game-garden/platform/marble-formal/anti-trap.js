import{sweep}from'../marble-demo/physics.js';
const monitors=new WeakMap();
function monitor(w){if(!monitors.has(w))monitors.set(w,{start:w.clock,samples:[],hits:[],escapes:0,quiet:0,lastCount:w.blocks.filter(b=>b.alive&&b.type!=='crate').length});return monitors.get(w);}
export function noteCollision(w,b){if(b.type==='crate'){const m=monitor(w),last=m.hits.at(-1);if(last?.at===w.clock&&last.id===b.id)return;m.hits.push({at:w.clock,id:b.id});}}
export function holdOverlap(w){if(w.phase!=='playing'||!w.ball||w.math.active)return false;const p=w.ball;const b=w.blocks.find(b=>{if(!b.alive)return false;const dx=Math.max(b.x-p.x,0,p.x-b.x-b.w),dy=Math.max(b.y-p.y,0,p.y-b.y-b.h);return dx*dx+dy*dy<8.9*8.9;});if(!b)return false;w.ball=null;w.phase='recovering';w.recoveryReturn='ready';w.stopInput();w.emit({type:'physics-hold',reason:'overlap',obstacle:b.id});return true;}
export function inspectTrap(w){const m=monitor(w);if(w.phase!=='playing'||!w.ball){m.samples=[];m.hits=[];m.start=w.clock;return null;}if(w.clock<(m.nextAt||0))return null;m.nextAt=w.clock+1/30;const b=w.ball,count=w.blocks.filter(b=>b.alive&&b.type!=='crate').length;if(count!==m.lastCount){m.start=w.clock;m.lastCount=count;m.escapes=0;m.samples=[];m.hits=[];}m.samples.push({at:w.clock,x:b.x,y:b.y,vx:b.vx,vy:b.vy});while(m.samples[0]?.at<w.clock-4)m.samples.shift();while(m.hits[0]?.at<w.clock-4)m.hits.shift();if(w.clock<m.quiet||m.samples.length<10)return null;
 const first=m.samples[0],xs=m.samples.map(p=>p.x),ys=m.samples.map(p=>p.y),spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys),age=w.clock-first.at,ids=new Set(m.hits.map(h=>h.id));
 const local=age>3.8&&spanX<230&&spanY<85&&Math.abs(b.y-first.y)<18,repeat=m.hits.length>=8&&ids.size<=3&&ids.size>=1,directions=new Set(m.samples.map(p=>Math.round(Math.atan2(p.vy,p.vx)*180/Math.PI/5))),cycle=directions.size<=4;
 const prolonged=w.clock-m.start>90&&m.hits.length>=8&&spanY<150;
 if(!(repeat&&(local&&cycle||prolonged)))return null;
 const evidence={type:'physics-trap',clock:w.clock,spanX,spanY,contacts:m.hits.length,obstacles:[...ids],cycle,age};
 if(m.escapes<2){const preferred=Math.atan2(b.vx,Math.max(Math.abs(b.vy),w.speed()*.35)),beforeVelocity={vx:b.vx,vy:b.vy};for(const a of[preferred,preferred*.75,preferred*.4,0,.35,-.35]){const vx=Math.sin(a)*w.speed(),vy=Math.cos(a)*w.speed(),probe={...b,vx,vy},dt=32/w.speed();if(w.blocks.some(x=>x.alive&&sweep(probe,x,dt)))continue;b.vx=vx;b.vy=vy;m.escapes++;m.quiet=w.clock+1;m.samples=[];m.hits=[];w.emit({...evidence,type:'physics-escape',attempt:m.escapes,beforeVelocity,afterVelocity:{vx,vy}});return{...evidence,result:'escaped'};}}
 w.ball=null;w.phase='recovering';w.recoveryReturn='ready';w.stopInput();m.samples=[];m.hits=[];w.emit({...evidence,type:'physics-hold'});return{...evidence,result:'safe-retry'};
}
export function diagnostics(w){const m=monitor(w);return{escapes:m.escapes,samples:m.samples.length,contacts:m.hits.length};}
