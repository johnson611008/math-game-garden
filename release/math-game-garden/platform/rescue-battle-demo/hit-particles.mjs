// Visual-only hit feedback. This module has no access to battle state or grading.
import {visibleBox} from './combat-presentation.mjs';
export const HIT_TIMING=Object.freeze({flight:200,duration:480,reduced:160});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function planHitBurst({width,height,target,rect,direction,recoil=0,reduced=false,color='#e32d42'}){
 if(!['hero','boss'].includes(target)||![1,-1].includes(direction)||![width,height,rect?.x,rect?.y,rect?.width,rect?.height].every(Number.isFinite)||width<=0||height<=0||rect.width<=0||rect.height<=0)throw Error('invalid-hit-geometry');
 const body=visibleBox(rect,target),bw=body.right-body.left,bh=body.bottom-body.top;
 const radius=clamp(bw*.022,2.2,6),anchor={x:clamp(body.left+bw*.51,radius*2,width-radius*2),y:clamp(body.top+bh*.51,radius*2,height-radius*2)};
 const distance=Math.min(width*.072,bw*.32,58),drift=direction*Math.min(Math.abs(Number.isFinite(recoil)?recoil:0),width*.06);
 const angles=[-48,-27,-10,10,29,48,65],particles=reduced?[]:angles.map((angle,i)=>{
  const radians=angle*Math.PI/180,reach=distance*(.58+(i%3)*.18),r=radius*(i%2?.74:1);
  const start={x:clamp(anchor.x+direction*(i%3)*1.4,r,width-r),y:clamp(anchor.y+(i%2?2:-2),r,height-r)};
  const end={x:clamp(start.x+drift+direction*Math.cos(radians)*reach,r,width-r),y:clamp(start.y+Math.sin(radians)*reach*.65,r,height-r)};
  return {start,end,radius:r,angle:direction>0?angle:180-angle,fall:Math.min(6,height*.025),dx:end.x-start.x,dy:end.y-start.y};
 });
 return {width,height,target,direction,recoil:drift,body,anchor,radius,color:/^#[0-9a-f]{6}$/i.test(color)?color:'#e32d42',particles,duration:reduced?HIT_TIMING.reduced:HIT_TIMING.duration,flight:reduced?0:HIT_TIMING.flight,reduced};
}
export function mountHitParticles(stage){
 const ns='http://www.w3.org/2000/svg',node=(tag,attrs={})=>{const e=stage.ownerDocument.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
 const root=node('svg',{id:'hit-blood',class:'hit-blood','aria-hidden':'true',focusable:'false',hidden:''});stage.append(root);
 const seen=new Set(),history=[],animations=new Set();let current=null,generation=0;
 const clearVisual=()=>{for(const a of animations)a.cancel();animations.clear();root.replaceChildren();root.setAttribute('hidden','');};
 const run=(element,frames,duration)=>{const a=element.animate(frames,{duration,easing:'linear',fill:'forwards'});animations.add(a);if(stage.ownerDocument.hidden)a.pause();return a.finished.catch(()=>{}).finally(()=>animations.delete(a));};
 function draw(record,duration){
  const owner=++generation,p=record.plan;root.setAttribute('viewBox',`0 0 ${p.width} ${p.height}`);root.dataset.target=p.target;root.dataset.mode=p.reduced?'flash':'particles';root.dataset.token=String(record.token);root.removeAttribute('hidden');
  const pending=[];
  if(p.reduced){
   const flash=node('ellipse',{cx:p.anchor.x,cy:p.anchor.y,rx:p.radius*3.1,ry:p.radius*2.7,fill:p.color,'data-red-flash':''});root.append(flash);
   pending.push(run(flash,[{opacity:0},{opacity:.4,offset:.38},{opacity:0}],duration));
  }else for(const drop of p.particles){
   const group=node('g',{transform:`translate(${drop.start.x} ${drop.start.y})`,'data-particle':''}),motion=node('g');group.append(motion);
   // Rounded droplet / spark shape, no wounds or permanent surface marks.
   motion.append(node('path',{d:'M -1.2 0 C -.7 -1.1 .65 -1.05 1.15 0 C .55 1.1 -.75 1.05 -1.2 0 Z',transform:`scale(${drop.radius})`,fill:p.color,stroke:'#6c1830','stroke-width':'.19','stroke-linejoin':'round'}));
   motion.append(node('ellipse',{cx:-drop.radius*.25,cy:-drop.radius*.22,rx:drop.radius*.30,ry:drop.radius*.15,fill:'#ff9ca7',opacity:'.75'}));root.append(group);
   const rotation=drop.angle,move=(x,y,scale)=>`translate(${x}px,${y}px) rotate(${rotation}deg) scale(${scale})`;
   pending.push(run(motion,[{opacity:0,transform:move(0,0,.45)},{opacity:1,transform:move(drop.dx*.22,drop.dy*.22,.92),offset:.12},{opacity:.95,transform:move(drop.dx,drop.dy,1),offset:HIT_TIMING.flight/HIT_TIMING.duration},{opacity:0,transform:move(drop.dx,clamp(drop.dy+drop.fall,-drop.start.y+drop.radius,p.height-drop.start.y-drop.radius),.45)}],duration));
  }
  void Promise.all(pending).then(()=>{if(owner!==generation)return;record.finished=true;record.ended=performance.now();record.activeDuration=Math.max(...record.animationDurations,0);root.setAttribute('hidden','');root.replaceChildren();current=null;});
 }
 function play(input){
  if(seen.has(input.token))return false;
  const plan=planHitBurst(input);seen.add(input.token);clearVisual();
  const record={token:input.token,target:plan.target,plan,started:performance.now(),finished:false,animationDurations:[plan.duration]};history.push(record);current=record;draw(record,plan.duration);return true;
 }
 function reduce(){
  if(!current||current.plan.reduced)return;
  const record=current;++generation;clearVisual();record.plan={...record.plan,reduced:true,particles:[]};record.preferenceChanged=true;record.animationDurations.push(120);draw(record,120);
 }
 function setVisibility(hidden){for(const a of animations)if(a.playState!=='finished'){if(hidden)a.pause();else a.play();}}
 function reset(){++generation;clearVisual();seen.clear();history.length=0;current=null;}
 let lastSize={width:stage.clientWidth,height:stage.clientHeight};
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{const size={width:stage.clientWidth,height:stage.clientHeight};if(current&&(Math.abs(size.width-lastSize.width)>1||Math.abs(size.height-lastSize.height)>1)){current.cancelled='resize';current.finished=true;current.ended=performance.now();++generation;clearVisual();current=null;}lastSize=size;}).observe(stage);
 return {play,reduce,setVisibility,reset,inspect:()=>({plays:history.length,active:!!current,hidden:root.hasAttribute('hidden'),animations:animations.size,history:structuredClone(history)})};
}
