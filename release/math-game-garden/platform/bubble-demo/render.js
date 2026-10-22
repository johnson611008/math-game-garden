import {W,H,R,ROW,cell,FAIL,LAUNCH} from './engine.js';
import {predictGuide,drawGuide} from './aim-guide.js';
import {MoleOperator} from './operator.js';
const palettes=[['#ffb9c3','#f46d9f','#ad3878'],['#b1f6fa','#54c8df','#3178b2'],['#dbbaff','#a087eb','#6652ad'],['#fff1a7','#ecc562','#b17b36']];
export function orb(ctx,x,y,r,color,alpha=1){const p=palettes[color];ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x-r*.32,y-r*.4,r*.05,x+r*.1,y+r*.15,r);g.addColorStop(0,'#fffef2');g.addColorStop(.25,p[0]);g.addColorStop(.66,p[1]);g.addColorStop(1,p[2]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#ffffffb0';ctx.stroke();ctx.strokeStyle='#ffffffb0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.37,r*.38,r*.17,-.5,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle='#fffdf1d0';ctx.beginPath();ctx.ellipse(x-r*.4,y-r*.43,r*.13,r*.08,-.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff66';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x+r*.05,y+r*.03,r*.77,.15,1.75);ctx.stroke();ctx.restore();}
function star(ctx,x,y,size){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,d=i%2?size*.25:size;const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
export class Renderer{
 constructor(canvas,images){this.ctx=canvas.getContext('2d');this.images=images;this.effects=[];this.lastId=0;this.clock=0;this.operator=new MoleOperator();}
 reset(){this.effects=[];this.lastId=0;this.operator.reset();}
 frame(game,dir,delta,reduced,aiming){const ctx=this.ctx;this.clock+=delta;
  if(game.last?.id!==this.lastId&&game.last){this.lastId=game.last.id;for(const b of game.last.popped)this.effects.push({...b,type:'pop',age:0});for(const b of game.last.fallen)this.effects.push({...b,type:'fall',age:0});}
  if(!game.paused)for(const fx of this.effects)fx.age+=delta;
  this.effects=this.effects.filter(f=>f.age<(reduced?.18:f.type==='fall'?1:.55));
  ctx.clearRect(0,0,W,H);ctx.save();
  const haze=ctx.createLinearGradient(0,0,0,H);haze.addColorStop(0,'#b6e8ec80');haze.addColorStop(.6,'#e7f6ee30');haze.addColorStop(1,'#7da59150');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
  // Decorative glass rail; collision bounds are the inner edges (36,564).
  for(const x of [28,572]){ctx.fillStyle='#edffdfb3';ctx.fillRect(x-4,45,8,FAIL-45);ctx.fillStyle='#769c9566';ctx.fillRect(x+3,45,2,FAIL-45);}
  ctx.strokeStyle='#56838a55';ctx.lineWidth=2;ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(38,FAIL);ctx.lineTo(562,FAIL);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#466f78';ctx.font='15px system-ui';ctx.textAlign='right';ctx.fillText('森林邊界',554,FAIL+22);
  // A visual ceiling descends together with its attached bubbles.
  ctx.strokeStyle='#d4bf80';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(36,52+game.offset);ctx.lineTo(564,52+game.offset);ctx.stroke();
  for(const b of game.grid.values()){const p=cell(b.r,b.c,game.offset);orb(ctx,p.x,p.y,R-1,b.color,.94);}
  if(game.status==='playing'&&!game.paused&&!game.ball)drawGuide(ctx,predictGuide(game,dir));
  for(const f of this.effects){const t=f.age,fade=Math.max(0,1-t/(reduced?.18:f.type==='fall'?1:.55));if(f.type==='fall'){orb(ctx,f.x+Math.sin(f.c)*t*35,f.y+(reduced?0:330*t*t),R-1,f.color,fade);continue;}if(!reduced){ctx.strokeStyle=palettes[f.color][0];ctx.globalAlpha=fade;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,R+t*52,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#fff4bc';for(let i=0;i<5;i++){const a=i*1.256+f.c;ctx.globalAlpha=fade;star(ctx,f.x+Math.cos(a)*t*110,f.y+Math.sin(a)*t*110,5*(1-t));}ctx.globalAlpha=1;}}
  this.operator.update(game,dir,delta,reduced,aiming);this.operator.draw(ctx,this.images.moles);
  ctx.save();ctx.translate(LAUNCH.x,750);ctx.rotate(Math.asin(dir.x)*.18);ctx.drawImage(this.images.launcher,-83,-81,166,115);ctx.restore();
  if(game.ball)orb(ctx,game.ball.x,game.ball.y,R-1,game.ball.color);else orb(ctx,LAUNCH.x,LAUNCH.y,R-1,game.current);
  ctx.fillStyle='#f6ffecdb';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('下一顆',460,688);orb(ctx,460,724,18,game.next);ctx.restore();
 }
}
