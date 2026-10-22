import {createGarden} from './garden.js';
import {browserStore} from './store.js';
import {STAGES,display} from './questions.js';
import {summary} from './state.js';
import {mountRemediationEntry} from '../src/ui/remediation-entry.js';
const $=id=>document.getElementById(id),canvas=$('garden'),garden=createGarden(canvas),store=browserStore(),tags=[];
const updateRemediation=mountRemediationEntry({anchor:$('ending').querySelector('h2'),href:'remediation.html',linkId:'mole-remediation-entry'});
let loaded=false,busy=false,last=0,selected=null,renderedPhase='',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,cachedView=store.view();
const state=()=>cachedView.state;
const formula=s=>{const m=/^(\d*)sqrt\((\d+)\)$/.exec(s);return m?`${m[1]}<span class="radical">√<span class="radicand">${m[2]}</span></span>`:String(Number(s));};
function questionHTML(q){const rad=q.powers?q.powers.map(([b,e])=>`${b}<sup>${e}</sup>`).join(' × '):q.radicand;return `${q.coefficient===1?'':q.coefficient}<span class="radical">√<span class="radicand">${rad}</span></span>`;}
function syncScene(){const s=state();garden.reset();selected=null;if(!s)return;garden.setStage(s.questions[s.index].stage);if(s.phase==='choosing')garden.show();renderedPhase=s.phase;}
function update(){const v=store.view();cachedView=v;const s=v.state,locked=busy||v.readOnly||!loaded,q=s?.questions[s.index],t=s?summary(s):null;
 const required=s?.phase==='settled'&&!s.settlement.passed;
 updateRemediation(v,{required,roundId:s?.id});
 $('start').hidden=!!s;$('start').disabled=locked;$('start').textContent='開始五關';$('again').disabled=locked||required&&!v.unlock;$('pause').hidden=!s||s.phase==='settled';$('pause').textContent=s?.phase==='paused'?'繼續':'暫停';$('pause').disabled=locked||['correct-feedback','wrong-feedback'].includes(s?.phase);
 $('ready').hidden=s?.phase!=='thinking';$('next').hidden=s?.phase!=='stage-complete';$('settle').hidden=s?.phase!=='awaiting-settlement';for(const id of ['ready','next','settle'])$(id).disabled=locked;
 $('ending').hidden=s?.phase!=='settled';document.querySelector('.question-board').hidden=s?.phase==='settled';
 $('progress').textContent=s?`第 ${q.stage} 關 · ${STAGES[q.stage-1]} · ${s.index+1}／15 題`:'五關十五題 · 首次答對 12 題達標';
 $('question').innerHTML=!s?'來草地冒險！':s.phase==='paused'?'暫停，地鼠也休息一下':s.phase==='stage-complete'?`第 ${q.stage} 關完成！`:s.phase==='awaiting-settlement'?'十五題完成，準備結算':questionHTML(q);
 $('combo').textContent=s?`首次正確 ${t.firstCorrect}／15 · 連擊 ${s.combo} · 已訂正 ${t.corrected}`:'';
 $('saved').textContent=v.pending||busy?'正在確認保存，請稍候…':`${v.status.saved?'已確認保存':'保存尚未確認'} · revision ${v.revision} · ${v.status.code}`;
 $('error').hidden=v.status.saved||v.status.code==='loading';if(!$('error').hidden)$('error').textContent=`尚未確認保存，成績不會提前採用。\n${v.status.code}\n請按「重新讀取」確認原回合；不會自動重設。`;
 $('stages').replaceChildren(...STAGES.map((name,i)=>{const b=document.createElement('button');b.textContent=`${i+1} ${name}`;b.className=q?.stage===i+1?'current':'';const completed=s&&s.questions.filter(x=>x.stage===i+1).every(x=>s.records[x.id]?.resolved);b.disabled=!completed;b.title=completed?'回顧本關成果':'完成前關後依序進入';b.onclick=()=>review(i+1);return b;}));
 const visible=s&&['choosing','wrong-feedback','correct-feedback'].includes(s.phase);tags.forEach((b,i)=>{b.hidden=!visible;if(visible)b.innerHTML=`<span class="key">${i+1}</span>${formula(q.options[i].expression)}`;b.disabled=locked||s?.phase!=='choosing'||!garden.canHit(i);});
 if(s?.phase==='settled'){$('results').textContent=`首次正確 ${t.firstCorrect}／15 · 訂正 ${t.corrected} 題\n最佳首次連擊 ${t.bestCombo}\n${s.settlement.passed?'已正式結算，達標通關！':v.unlock?'指定補救已達標，已取得一次重新挑戰資格；開始新回合時才消耗。':'本次未達標，需要完成根式化簡指定補救：十題首次至少八題正確。'}\n舊正式成績與補救歷史保留，訂正不改寫首次結果。`;document.body.classList.toggle('celebrating',!reduced);}else document.body.classList.remove('celebrating');
}
async function commit(command){if(busy)return false;busy=true;update();const r=await store.commit(command);busy=false;update();return r.saved;}
async function event(type,more={}){return commit({event:{id:crypto.randomUUID(),roundId:state()?.id,at:new Date().toISOString(),type,...more}});}
async function start(){if(await commit({start:{id:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0],at:new Date().toISOString()}})){syncScene();$('status').textContent='先慢慢想，準備好再讓地鼠出場。';update();}}
for(let i=0;i<3;i++){const b=document.createElement('button');b.className='answer-tag';b.dataset.hole=i;b.hidden=true;b.onclick=()=>attempt(i);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tags[(i+(e.key==='ArrowRight'?1:2))%3].focus();}};$('answers').append(b);tags.push(b);}
async function attempt(hole,x,y){const s=state();if(busy||!loaded||s?.phase!=='choosing'||!garden.canHit(hole))return;const q=s.questions[s.index];if(!await event('choose',{questionId:q.id,hole}))return;selected=hole;const correct=state().phase==='correct-feedback';garden.impact(hole,correct,x,y);$('status').textContent=correct?'敲對了！訂正不會改寫首次成績。':'再看看平方因數與剩餘因數，可以再選一次。';update();}
async function load(){if(busy)return;busy=true;await store.load();cachedView=store.view();busy=false;syncScene();update();$('status').textContent=state()?'已讀取原回合；首次成績與題目保留。':'沒有倒數。五關等你來挑戰。';}
function review(stage=null){const v=store.view();$('review-content').replaceChildren();for(const s of v.document.rounds){const heading=document.createElement('p');heading.textContent=`回合 ${s.id} · ${s.phase} · 首次 ${summary(s).firstCorrect}／15`;$('review-content').append(heading);for(const q of s.questions.filter(q=>(!stage||q.stage===stage)&&s.records[q.id]?.resolved)){const r=s.records[q.id],line=document.createElement('p');line.textContent=`${display(q.source)}：首次 ${display(r.first.answer)}（${r.first.accepted?'答對':'答錯'}）${r.corrected?' · 已訂正':''}`;$('review-content').append(line);}}$('review').showModal();}
$('start').onclick=start;$('again').onclick=start;$('ready').onclick=async()=>{if(await event('ready')){garden.show();renderedPhase='choosing';$('status').textContent='地鼠會一直等你。敲敲你選的答案。';update();}};
$('next').onclick=async()=>{if(await event('next-stage')){syncScene();update();}};$('settle').onclick=async()=>{if(await event('settle')){garden.reset();update();}};
$('pause').onclick=async()=>{if(await event(state().phase==='paused'?'resume':'pause')){syncScene();update();}};$('reload').onclick=load;$('history').onclick=()=>review();$('close-review').onclick=()=>$('review').close();
$('reduce').onclick=()=>{reduced=!reduced;garden.setReduced(reduced);$('reduce').setAttribute('aria-pressed',String(reduced));update();};garden.setReduced(reduced);
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;e.preventDefault();canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,i=garden.hitTest(x,y);if(i>=0)attempt(i,x,y);});
window.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('review').open)return;if(['1','2','3'].includes(e.key)){e.preventDefault();attempt(Number(e.key)-1);}});window.addEventListener('resize',()=>garden.resize());
async function endReaction(){if(busy)return;if(await event('reaction-end')){syncScene();update();}}
function frame(time){const dt=last?Math.min(.08,(time-last)/1000):0;last=time;if(loaded&&!document.hidden){const s=state();if(s?.phase!=='paused')garden.frame(dt);if(s?.phase==='wrong-feedback'&&((selected!==null&&garden.recovered(selected))||(selected===null&&garden.settled())))endReaction();else if(s?.phase==='correct-feedback'&&garden.settled())endReaction();tags.forEach((b,i)=>{if(!b.hidden){const p=garden.labelPoint(i);b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.opacity=String(Math.min(1,garden.read().actors[i].visible*1.5));b.disabled=busy||cachedView.readOnly||s?.phase!=='choosing'||!garden.canHit(i);}});}requestAnimationFrame(frame);}
garden.load().then(async()=>{loaded=true;await load();}).catch(e=>{$('error').hidden=false;$('error').textContent='安全停止：素材或題庫未就緒。'+e.message;});requestAnimationFrame(frame);
