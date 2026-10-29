import {games,practice} from './config.js';
import {applyHomeNavigation} from './resume-ui.js';
import {browserAdmission} from '../src/learning/cross-unit-admission.mjs';
const $=id=>document.getElementById(id);
for(const [i,g] of games.entries()){
 const card=document.createElement('article');card.className='game '+(g.href?'open':'locked');card.style.setProperty('--frame',`url('assets/reference/frame-${i}.png')`);card.setAttribute('aria-labelledby',`game-${i}`);
 if(g.scene)card.classList.add('updated-card');
 const topic=document.createElement('span');topic.className='topic';topic.textContent=g.topic;
 const title=document.createElement('h3');title.id=`game-${i}`;title.textContent=g.name;
 const scene=document.createElement('div');scene.className='scene';scene.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=g.scene||(i===1||i===2?`assets/reference/scene-${i}-unlocked.png`:`assets/reference/scene-${i}.png`);image.alt=g.sceneAlt||'';image.width=290;image.height=190;scene.append(image);
 const caption=document.createElement('p');caption.className='card-note';caption.textContent=g.caption||(g.href?['化簡根式・敲出正確答案！','根式乘除・充能連鎖破磚！','根式加減・點亮泡泡魔法！'][i]:g.topic+'・下一段冒險準備中');
 const status=document.createElement(g.href?'a':'span');status.className='entry';if(g.href){status.href=g.href;status.textContent='開始／繼續遊戲 →';}else{status.textContent='敬請期待';status.setAttribute('aria-disabled','true');const lock=document.createElement('span');lock.className='lock';lock.setAttribute('aria-hidden','true');scene.append(lock);}
 if(g.scene&&!g.href){status.textContent='尚未開放';status.setAttribute('aria-label',g.name+'，尚未開放；跨單元解鎖驗證待完成');}
 card.append(topic,title,scene,caption,status);$('game-list').append(card);
}
const content=$('practice-content');for(const [i,unit]of practice.units.entries()){const a=document.createElement('a');a.href=unit.href;a.className='practice-link';a.textContent=`第${['一','二','三','四','五'][i]}單元：${unit.title}・開始／繼續練習 →`;content.append(a);}
for(const title of practice.locked){const p=document.createElement('p');p.className='unreleased';p.textContent=title+' · 尚未開放';content.append(p);}
$('practice').onclick=()=>$('practice-dialog').showModal();$('close-practice').onclick=()=>$('practice-dialog').close();$('practice-dialog').addEventListener('click',e=>{if(e.target===$('practice-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const media=matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches;
function motion(){document.documentElement.dataset.reduced=String(reduced);$('motion').setAttribute('aria-pressed',String(reduced));$('motion').textContent=reduced?'降低動畫：開':'降低動畫：關';}
$('motion').onclick=()=>{reduced=!reduced;motion();};motion();media.addEventListener('change',e=>{reduced=e.matches;motion();});

// Navigation mirrors the same local authority used by both formal stores.
const admission=browserAdmission();let admissionRequest=0;
function showAdmission(target,result){const card=$('game-list').children[target-1],g=games[target-1],old=card.querySelector('.entry'),entry=document.createElement(result.allowed?'a':'span');entry.className='entry';card.classList.toggle('open',result.allowed);card.classList.toggle('locked',!result.allowed);card.classList.add('admission-card');card.dataset.admission=result.code;
 if(result.allowed){entry.href=g.targetPath;entry.textContent='開始／繼續遊戲 →';entry.addEventListener('click',async e=>{e.preventDefault();const current=await admission.check(target);showAdmission(target,current);const destination=card.querySelector('a.entry');if(current.allowed&&destination)location.assign(destination.href);});}
 else{entry.setAttribute('aria-disabled','true');entry.append(document.createTextNode(result.code==='prerequisite-checking'?'確認前置紀錄中':'尚未解鎖'));const small=document.createElement('small');small.textContent=result.errors.length?'前置讀取異常，請重新確認':result.missing.length?'尚缺：第'+result.missing.map(s=>s.unit).join('、')+'單元正式通關':'請稍候';entry.append(small);entry.setAttribute('aria-label',g.name+'，'+small.textContent+'；'+result.errors.map(e=>e.unit+'／'+e.code).join('；'));}
 old.replaceWith(entry);applyHomeNavigation();
}
async function refreshAdmission(){const request=++admissionRequest;const result=await admission.both();if(request!==admissionRequest)return;for(const target of[4,5])showAdmission(target,result[target]);document.documentElement.dataset.admissionReady='true';}
for(const target of[4,5])showAdmission(target,{allowed:false,code:'prerequisite-checking',errors:[],missing:[]});
addEventListener('focus',()=>void refreshAdmission());addEventListener('pageshow',()=>void refreshAdmission());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshAdmission();});void refreshAdmission();
