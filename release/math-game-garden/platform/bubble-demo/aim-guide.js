// Presentation only. Reads the original swept collision query; never mutates the game.
import {LAUNCH,R,LEFT,RIGHT,TOP,cell,key,neighbors,aim} from './engine.js';
export function predictGuide(game,direction){
 const d=aim(LAUNCH.x+direction.x*500,LAUNCH.y+direction.y*500);
 let x=LAUNCH.x,y=LAUNCH.y,dx=d.x,dy=d.y;
 const points=[{x,y}];
 for(let bounce=0;bounce<12;bounce++){
  const wall=Math.abs(dx)<1e-9?Infinity:((dx>0?RIGHT-R:LEFT+R)-x)/dx;
  const ceiling=(TOP+game.offset-y)/dy;
  const distance=Math.min(wall,ceiling);
  if(!Number.isFinite(distance)||distance<0)return {points,landing:null,kind:'unavailable'};
  const hit=game.collision(x,y,dx*distance,dy*distance);
  if(hit){x+=dx*distance*hit.t;y+=dy*distance*hit.t;points.push({x,y});return finish(game,points,'bubble',hit.bubble);}
  x+=dx*distance;y+=dy*distance;points.push({x,y});
  if(ceiling<=wall)return finish(game,points,'top',null);
  dx=-dx;
 }
 return {points,landing:null,kind:'unavailable'};
}
function finish(game,points,kind,hit){
 const p=points.at(-1),options=hit?neighbors(hit.r,hit.c):Array.from({length:11},(_,c)=>[0,c]);
 const available=options.filter(([r,c])=>!game.grid.has(key(r,c)));
 available.sort((a,b)=>{const u=cell(...a,game.offset),v=cell(...b,game.offset);return (u.x-p.x)**2+(u.y-p.y)**2-((v.x-p.x)**2+(v.y-p.y)**2);});
 const at=available[0];
 return {points,kind,landing:at?{r:at[0],c:at[1],...cell(...at,game.offset)}:null};
}
export function drawGuide(ctx,guide){
 if(guide.points.length<2)return;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 ctx.beginPath();guide.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
 // A subtle dark spine plus matching dark-rimmed white dots stays visible on pastel art.
 ctx.setLineDash([]);ctx.strokeStyle='#173c50b3';ctx.lineWidth=1.6;ctx.stroke();
 ctx.setLineDash([1,14]);ctx.strokeStyle='#173c50';ctx.lineWidth=7;ctx.stroke();
 ctx.strokeStyle='#fffef5';ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);
 if(guide.landing){const p=guide.landing;ctx.beginPath();ctx.arc(p.x,p.y,R-2,0,Math.PI*2);ctx.strokeStyle='#173c50';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#fffef5';ctx.lineWidth=2;ctx.stroke();
  // Small centre cross; no opaque fill and no pulsing or flashing.
  ctx.beginPath();ctx.moveTo(p.x-5,p.y);ctx.lineTo(p.x+5,p.y);ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x,p.y+5);ctx.lineWidth=4;ctx.strokeStyle='#173c50';ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='#fffef5';ctx.stroke();
 }
 ctx.restore();
}
