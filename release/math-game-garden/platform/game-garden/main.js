import {games,practice} from './config.js';
const $=id=>document.getElementById(id);
for(const [i,g] of games.entries()){
 const card=document.createElement('article');card.className='game '+(g.href?'open':'locked');card.style.setProperty('--frame',`url('assets/reference/frame-${i}.png')`);card.setAttribute('aria-labelledby',`game-${i}`);
 const topic=document.createElement('span');topic.className='topic';topic.textContent=g.topic;
 const title=document.createElement('h3');title.id=`game-${i}`;title.textContent=g.name;
 const scene=document.createElement('div');scene.className='scene';scene.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=i===1||i===2?`assets/reference/scene-${i}-unlocked.png`:`assets/reference/scene-${i}.png`;image.alt='';image.width=290;image.height=190;scene.append(image);
 const caption=document.createElement('p');caption.className='card-note';caption.textContent=g.href?['化簡根式・敲出正確答案！','根式乘除・充能連鎖破磚！','根式加減・點亮泡泡魔法！'][i]:g.topic+'・下一段冒險準備中';
 const status=document.createElement(g.href?'a':'span');status.className='entry';if(g.href){status.href=g.href;status.textContent='開始／繼續遊戲 →';}else{status.textContent='敬請期待';status.setAttribute('aria-disabled','true');const lock=document.createElement('span');lock.className='lock';lock.setAttribute('aria-hidden','true');scene.append(lock);}
 card.append(topic,title,scene,caption,status);$('game-list').append(card);
}
const content=$('practice-content');for(const [i,unit]of practice.units.entries()){const a=document.createElement('a');a.href=unit.href;a.className='practice-link';a.textContent=`第${['一','二','三','四','五'][i]}單元：${unit.title}・開始／繼續練習 →`;content.append(a);}
for(const title of practice.locked){const p=document.createElement('p');p.className='unreleased';p.textContent=title+' · 尚未開放';content.append(p);}
$('practice').onclick=()=>$('practice-dialog').showModal();$('close-practice').onclick=()=>$('practice-dialog').close();$('practice-dialog').addEventListener('click',e=>{if(e.target===$('practice-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const media=matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches;
function motion(){document.documentElement.dataset.reduced=String(reduced);$('motion').setAttribute('aria-pressed',String(reduced));$('motion').textContent=reduced?'降低動畫：開':'降低動畫：關';}
$('motion').onclick=()=>{reduced=!reduced;motion();};motion();media.addEventListener('change',e=>{reduced=e.matches;motion();});
