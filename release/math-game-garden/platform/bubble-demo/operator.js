// Existing WP06-A expression sprites + explicitly procedural transforms; no new action frames.
import {cell,R,ROW,FAIL} from './engine.js';
export class MoleOperator{
 constructor(){this.reset();}
 reset(){this.lastShot=0;this.lastResult=0;this.fireAge=9;this.happyAge=9;this.missAge=9;this.pose={mode:'idle',frame:'idle',x:168,y:782,lift:0,angle:0,scale:1};}
 update(game,dir,dt,reduced,aiming){
  if(!game.paused){this.fireAge+=dt;this.happyAge+=dt;this.missAge+=dt;}
  if(game.shots>this.lastShot){this.lastShot=game.shots;this.fireAge=0;}
  if(game.last&&game.last.id!==this.lastResult){this.lastResult=game.last.id;if(game.last.popped.length)this.happyAge=0;else this.missAge=0;}
  const danger=[...game.grid.values()].some(b=>cell(b.r,b.c,game.offset).y+R>=FAIL-2*ROW);
  let mode='idle',frame='idle',lift=0,angle=0,scale=1;
  if(this.fireAge<.48){mode='launch';frame='peek';if(!reduced){const wave=Math.sin(Math.PI*this.fireAge/.48);lift=-10*wave;angle=-.1*wave;scale=1+.045*wave;}}
  else if(game.status==='lost'||danger||this.missAge<.85){mode='surprised';frame='surprise';}
  else if(this.happyAge<1.1||game.status==='won'){mode='happy';frame='smile';if(!reduced)lift=-3*Math.sin(Math.PI*Math.min(1,this.happyAge/1.1));}
  else if(aiming||(!game.ball&&game.status==='playing'&&Math.abs(dir.x)>.1)){mode='prepare';frame=dir.x<-.15?'left':dir.x>.15?'right':'peek';if(!reduced){angle=dir.x*.065;scale=1.025;}}
  this.pose={mode,frame,x:168,y:782,lift,angle,scale};return this.pose;
 }
 draw(ctx,images){const p=this.pose,img=images[p.frame];if(!img)return;ctx.save();ctx.translate(p.x,p.y+p.lift);ctx.rotate(p.angle);ctx.scale(p.scale,p.scale);ctx.drawImage(img,-55,-96,110,96);ctx.restore();}
}
