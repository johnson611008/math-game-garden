import {mountAdmissionNotice} from '../src/ui/admission-notice.mjs';
import {browserStore} from './store.mjs';
import {CONTENT,ASSETS} from '../rescue-battle-demo/model.mjs';
import {QUESTIONS,pretty,validateBank} from '../rescue-battle-demo/questions.mjs';
import {createBattle,transition,submit,resolve,finishAttack,score} from '../rescue-battle-demo/battle.mjs';
import {editWithSymbol} from '../src/ui/math-input.js';
import {mountMathKeyboard} from '../src/ui/math-keyboard-focus.js';
import {STAGES,planAttack,endingView} from '../rescue-battle-demo/combat-presentation.mjs';
import {mountHitParticles} from '../rescue-battle-demo/hit-particles.mjs';
import {mountGrandFinale} from './grand-finale.mjs';
const $=id=>document.getElementById(id);
const store=browserStore();let busy=false,loaded=false,assetsReady=false;
const admissionUI=mountAdmissionNotice({reload:()=>$('reload-saved').click(),isBusy:()=>busy});
const limitation='正式十題與指定補救：只恢復已確認保存的紀錄。補救達標可取得一次重挑資格。清除網站資料或更換裝置可能失去進度。';
const eventId=()=>crypto.randomUUID();
let state=createBattle(),shownIndex=-1,epoch=0,animationStarts=0,history=[];
const active=new Set();
const hitEffects=mountHitParticles(document.querySelector('.fighters'));
let attackStage=null,lastAttack=null;
const attackTraces=[];
$('chapter').textContent=CONTENT.chapter;$('intro-title').textContent=CONTENT.title;
for(const text of CONTENT.story){const p=document.createElement('p');p.textContent=text;$('story').append(p);}
for(const text of CONTENT.rules){const li=document.createElement('li');li.textContent=text;$('rules-list').append(li);}
$('intro-art-note').textContent=CONTENT.artStatus;$('intro-scope').textContent=limitation;$('scope-note').textContent=limitation;
const keys=['7','8','9','√','backspace','4','5','6','×','÷','1','2','3','+','−','0','(',')','/','clear'];
for(const symbol of keys){const b=document.createElement('button');b.type='button';b.dataset.symbol=symbol;b.textContent=({backspace:'刪除',clear:'清除','/':'分數'})[symbol]||symbol;b.setAttribute('aria-label',({backspace:'刪除游標前一字',clear:'清除答案','/':'分數斜線','√':'輸入根號'})[symbol]||symbol);$('symbols').append(b);}
const keyboard=mountMathKeyboard(document,[$('answer')],$('symbols'));
$('submit').after($('next')); // Reuse the action slot; completing a question does not add a new control row.
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');$('reduced').checked=motionPreference.matches;
const grandFinale=mountGrandFinale({reduced:()=>$('reduced').checked});
const finaleButton=document.createElement('button');finaleButton.id='open-grand-finale';finaleButton.type='button';finaleButton.hidden=true;finaleButton.textContent='開啟五關全通關慶典';$('result-score').after(finaleButton);
finaleButton.onclick=async()=>{if(!await grandFinale.show())$('status').textContent='尚未確認完整五關通關成果，原成績保留。請重新讀取確認。';};
motionPreference.addEventListener('change',event=>{if(event.matches){$('reduced').checked=true;$('reduced').dispatchEvent(new Event('change'));}});
const ended=()=>['victory','defeat'].includes(state.phase);
function questionView(q){
 $('question').replaceChildren();$('question').setAttribute('aria-label',q.text);
 if(q.denominator){const f=document.createElement('span');f.className='fraction';for(const [klass,text]of [['num',q.numerator],['den',q.denominator]]){const e=document.createElement('span');e.className=klass;e.textContent=pretty(text);f.append(e);}$('question').append(f);}else $('question').textContent=q.text;
 $('concept').textContent=q.concept;
}
function render(){
 const intro=state.phase==='intro',ending=ended(),r=state.records[state.index],s=score(state);
 document.body.dataset.phase=state.phase;document.body.dataset.attackStage=attackStage||'';$('intro').hidden=!intro;$('battle').hidden=intro||state.phase==='defeat';$('defeat-ending').hidden=state.phase!=='defeat';
 $('start').disabled=state.assets!=='ready'||!loaded||busy||!store.view().canStart;$('start').textContent=state.assets==='failed'?'素材載入失敗，請重新整理':'拯救人質！';
 const saved=store.view();admissionUI(saved.admission);
 finaleButton.hidden=state.phase!=='victory'||!state.endingPlayed||!saved.status.saved||!saved.admission.allowed;
 $('save-status').textContent=busy?'正在安全保存…':saved.status.saved&&loaded?(saved.status.code==='read-only-no-locks'?'唯讀：Web Locks不可用':'已確認保存 · r'+saved.revision):'尚未確認保存';
 $('status').textContent=!assetsReady?'正在檢查題庫與角色素材。':!loaded?'正在讀取保存紀錄。':!saved.status.saved||saved.status.code==='read-only-no-locks'?'保存異常：'+saved.status.code+'；已停止新寫入。請重新讀取確認，勿清除網站資料。':busy?'正在安全交易，尚未確認本次結果。':!saved.admission.allowed?'原紀錄已保留；請完成前置正式通關後接續。':saved.state?.phase==='settled'?saved.challengeStatus+'；正式結算已保存，此回合唯讀。':saved.state?.phase==='awaiting-settlement'?'十題與必要訂正已保存；請明確確認正式結算。':saved.state?saved.challengeStatus+'；已確認保存，可於同一瀏覽器恢復。':'按下「拯救人質！」後才建立並保存正式回合。';
 $('reload-saved').hidden=busy||!loaded||saved.status.saved&&saved.status.code!=='read-only-no-locks';

 if(intro)return;
 if(shownIndex!==state.index){shownIndex=state.index;questionView(QUESTIONS[state.index]);$('answer').value='';}
 $('question-index').textContent='第'+(state.index+1)+'／10題';$('first-progress').textContent='首次正確 '+s.firstCorrect+'／10';
 // The exact result is already confirmed; present its single HP change at impact.
 const beforeImpact=['windup','dash'].includes(attackStage),heroHP=state.heroHP+(beforeImpact&&state.phase==='boss-attacking'?1:0),bossHP=state.bossHP+(beforeImpact&&state.phase==='hero-attacking'?1:0);
 $('hero-hp').textContent=heroHP+'／10';$('boss-hp').textContent=bossHP+'／10';$('hero-meter').value=heroHP;$('boss-meter').value=bossHP;
 $('hero-meter').setAttribute('aria-label','勇者剩餘'+heroHP+'滴血');$('boss-meter').setAttribute('aria-label','Boss剩餘'+bossHP+'滴血');
 $('math-panel').hidden=ending;$('result').hidden=!ending;
 const locked=busy||store.view().readOnly||store.view().state?.phase!=='active'||!['battle','correction'].includes(state.phase)||r?.completed;
 $('answer').disabled=locked;$('submit').disabled=locked;$('hint').disabled=locked;
 for(const b of $('symbols').querySelectorAll('button'))b.disabled=locked;
 document.querySelector('.keyboard-mode').disabled=locked;
 $('answer-kind').textContent=r?.completed?'本題完成':state.phase==='hero-attacking'?'首次答對 · 演出中':state.phase==='boss-attacking'?'首次答錯 · 演出中':r?.first?'訂正 · 不再扣血':'首次作答';
 $('feedback').textContent=state.notice;$('feedback').classList.toggle('error',state.phase==='correction');
 $('submit').hidden=!!r?.completed;$('next').hidden=ending||!r?.completed;$('next').disabled=busy||store.view().readOnly;$('next').textContent=state.index===9?(store.view().state?.phase==='awaiting-settlement'?'確認完成挑戰 · 正式結算':'完成十題 · 檢查結算'):'下一題';
 $('action-caption').textContent=state.phase==='hero-attacking'?'攻擊成功！':state.phase==='boss-attacking'?'受到攻擊！':state.phase==='checking'?'精確驗算中…':state.phase==='victory'?(state.endingPlayed?'救援成功！':'封印破解，救援中…'):state.phase==='defeat'?'救援失敗':r?.completed?(r.corrected?'訂正成功，血量不變':'攻擊成功！'):'先想好，再出手';
 if(ending){
  $('result-title').textContent=state.phase==='victory'?'人質救援成功':'救援失敗';
  $('result-score').textContent='十題全部完成 · 首次正確 '+s.firstCorrect+'／10；勇者剩餘 '+state.heroHP+'／10滴血。';
  $('result-note').textContent=state.phase==='victory'?'十題封印已破解，Boss失去戰鬥能力並退場。敵方剩餘'+state.bossHP+'滴血仍按首次結果保留。':'勇者剩餘不足7滴血；美麗地鼠仍被囚禁。請完成指定補救練功；本階段不開放正式重挑。';
  $('remediation').hidden=state.phase!=='defeat';$('restart').hidden=true;$('restart').disabled=true;
  $('records').replaceChildren(...state.records.map((record,i)=>{const li=document.createElement('li');li.textContent='第'+(i+1)+'題 '+QUESTIONS[i].text+'｜首次：'+(record.first.accepted?'正確':'未正確')+'（'+record.first.answer+'）；訂正：'+(record.corrected?'成功，不回補':'不需')+'；最簡答案 '+pretty(QUESTIONS[i].answer);return li;}));
  if(state.phase==='defeat'){
   const view=endingView(s);$('defeat-correct').textContent=view.correct+'／10';$('defeat-hp').textContent=view.hp+'／10';
   $('defeat-reason').textContent='十題已全部完成。勇者剩餘'+view.hp+'滴血，未達救援所需的7滴血；首次成績保留，訂正不回補。';
   const e=saved.remediationEntry;
   for(const id of ['remediation','defeat-remediation']){
    $(id).disabled=busy||!saved.status.saved||saved.learningReadOnly||!e;
    const note=document.createElement('span');note.textContent=e?e.message+(e.progress?' · 已保存完成 '+e.progress+'／10':''):'補救狀態無法確認';
    $(id).replaceChildren(document.createTextNode(e?.label||'補救狀態無法確認'),note);
   }
   $('defeat-records').replaceChildren(...[...$('records').children].map(li=>li.cloneNode(true)));
  }
 }
}
function update(next){if(next===state)return;const old=state.phase;state=next;if(old!==state.phase)attackStage=['hero-attacking','boss-attacking'].includes(state.phase)?'windup':null;render();if(old!==state.phase){if(['hero-attacking','boss-attacking'].includes(state.phase))void attack();else if(state.phase==='victory')void rescue();else if(state.phase==='defeat'){state=transition(state,'ending-finished');render();scrollTo({top:0,behavior:'auto'});$('defeat-title').focus({preventScroll:true});}}}
function animate(node,frames,normal,fill='none'){
 const animation=node.animate(frames,{duration:$('reduced').checked?Math.min(160,normal):normal,easing:'ease-in-out',fill});
 active.add(animation);if(document.hidden)animation.pause();
 return animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
}
function cancelScene(){epoch++;attackStage=null;hitEffects.reset();for(const a of active)a.cancel();active.clear();for(const node of document.querySelectorAll('.fighters,.fighter,#hostage,#battle-cage,#rescued-actor,#rescue-glow,.slash,.charge-glow,.rush-trail')){for(const a of node.getAnimations())a.cancel();node.style.opacity='';node.style.transform='';}$('rescued-actor').hidden=true;for(const id of ['sword-flash','magic-flash','rescue-glow','charge-glow','rush-trail'])$(id).hidden=true;}
async function attack(){
 const owner=++epoch,token=state.animation.token,hero=state.phase==='hero-attacking',reduced=$('reduced').checked;
 animationStarts++;
 const attacker=$(hero?'hero-actor':'boss-actor'),victim=$(hero?'boss-actor':'hero-actor'),flash=$(hero?'sword-flash':'magic-flash');
 const stage=document.querySelector('.fighters'),stageRect=stage.getBoundingClientRect(),rect=node=>{const r=node.getBoundingClientRect();return{x:r.x-stageRect.x,y:r.y-stageRect.y,width:r.width,height:r.height};};
 const g=planAttack({width:stageRect.width,height:stageRect.height,hero:rect($('hero-actor')),boss:rect($('boss-actor'))},hero?'hero':'boss',reduced);lastAttack=g;
 const trace={token,kind:g.kind,geometry:g,stages:[],started:performance.now(),finished:false};attackTraces.push(trace);
 const charge=$('charge-glow'),trail=$('rush-trail');charge.dataset.kind=trail.dataset.kind=g.kind;
 const flashWidth=Math.min(stageRect.width*.37,250),flashHeight=flashWidth*.75;
 Object.assign(flash.style,{width:flashWidth+'px',height:flashHeight+'px',left:(g.impact.x-flashWidth/2)+'px',top:(g.impact.y-flashHeight/2)+'px'});
 Object.assign(charge.style,{left:g.charge.x+'px',top:g.charge.y+'px'});
 Object.assign(trail.style,{left:Math.min(g.charge.x,g.charge.x+g.dash)+'px',top:g.impact.y+'px',width:Math.max(20,g.distance)+'px'});
 charge.hidden=false;flash.hidden=true;trail.hidden=true;
 const transform=(x,sx=1,sy=1)=>`translateX(${x}px) scale(${sx},${sy})`;
 const play=(node,frames,duration)=>animate(node,frames,reduced?40:duration,'forwards');
 const setStage=id=>{attackStage=id;trace.stages.push({id,at:performance.now()-trace.started});render();$('action-caption').textContent=({windup:hero?'水晶蓄力…':'魔法蓄力…',dash:hero?'勇者衝刺！':'魔法突襲！',impact:hero?'攻擊成功！':'受到攻擊！',return:hero?'攻擊成功！':'受到攻擊！'})[id];};
 setStage(STAGES[0].id);
 await Promise.all([play(attacker,[{transform:transform(0)},{transform:transform(g.back,reduced?1:1.02,reduced?1:.95)}],250),play(charge,[{opacity:0,scale:'.7'},{opacity:reduced?.3:.85,scale:'1.2'}],250)]);
 if(owner!==epoch)return;
 setStage(STAGES[1].id);trail.hidden=reduced;
 await Promise.all([play(attacker,[{transform:transform(g.back,reduced?1:1.02,reduced?1:.95)},{transform:transform(g.dash)}],300),play(charge,[{opacity:reduced?.3:.85},{opacity:0}],300),play(trail,[{opacity:0},{opacity:.36,offset:.65},{opacity:.1}],300)]);
 if(owner!==epoch)return;
 setStage(STAGES[2].id);flash.hidden=false;
 hitEffects.play({token,target:hero?'boss':'hero',rect:rect(victim),width:stageRect.width,height:stageRect.height,direction:g.direction,recoil:g.kick,reduced:$('reduced').checked});
 await Promise.all([
  play(victim,[{transform:transform(0),filter:'brightness(1)'},{transform:transform(g.kick),filter:'brightness(1.65)',offset:.45},{transform:transform(g.kick),filter:'brightness(1)'}],200),
  play(flash,[{opacity:0,scale:'.65'},{opacity:reduced?.3:.95,scale:'1.06',offset:.4},{opacity:0,scale:'1.18'}],200),
  play(stage,[{transform:'translateX(0)'},{transform:`translateX(${reduced?0:-2}px)`,offset:.25},{transform:`translateX(${reduced?0:2}px)`,offset:.65},{transform:'translateX(0)'}],200),play(trail,[{opacity:.1},{opacity:0}],200)
 ]);
 if(owner!==epoch)return;
 setStage(STAGES[3].id);flash.hidden=true;
 await Promise.all([play(attacker,[{transform:transform(g.dash)},{transform:transform(0)}],450),play(victim,[{transform:transform(g.kick)},{transform:transform(0)}],450)]);
 if(owner!==epoch)return;
 for(const node of[attacker,victim,stage,charge,trail,flash])for(const a of node.getAnimations())a.cancel();
 for(const node of[charge,trail,flash])node.hidden=true;
 trace.finished=true;trace.finishedAt=performance.now()-trace.started;attackStage=null;
 update(finishAttack(state,token));if(['battle','correction'].includes(state.phase)&&!state.records[state.index].completed)$('answer').focus({preventScroll:true});
}
async function rescue(){
 const owner=++epoch;animationStarts++;
 await animate($('boss-actor'),[{opacity:1},{opacity:0}],800,'forwards');
 if(owner!==epoch)return;
 $('rescue-glow').hidden=false;
 await Promise.all([
  animate($('rescue-glow'),[{opacity:0},{opacity:.7}],600,'forwards'),
  animate($('battle-cage'),[{filter:'drop-shadow(0 0 0px #d8c5ff00) brightness(1)'},{filter:'drop-shadow(0 0 15px #e0c5ffb3) brightness(1.2)'}],600,'forwards')
 ]);
 await animate($('hostage'),[{opacity:1},{opacity:0}],1100,'forwards');
 if(owner!==epoch)return;
 $('rescued-actor').hidden=false;
 await Promise.all([
  animate($('rescued-actor'),[{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],650,'forwards'),
  animate($('rescue-glow'),[{opacity:.7},{opacity:.15}],650,'forwards')
 ]);
 if(owner!==epoch)return;
 if(owner!==epoch)return;
 update(transition(state,'ending-finished'));$('result-title').focus({preventScroll:true});await grandFinale.show();
}
async function commit(command){
 if(busy||!loaded)return false;busy=true;render();
 const result=await store.commit(command);busy=false;render();return result.saved;
}
async function loadAuthority(){
 await store.load();
 const v=store.view();
 if(v.status.saved&&!v.learningReadOnly&&v.qualificationCandidate)await store.commit({qualification:v.qualificationCandidate});
}
function restoreSaved(){
 cancelScene();shownIndex=-1;const round=store.view().state;
 state=round?structuredClone(round.battle):{...createBattle(),assets:assetsReady?'ready':'loading'};
 // Ending animations are presentation only. Restoring an acknowledged ending
 // shows its final pose directly rather than replaying attacks or settlement.
 if(round?.phase==='settled')state={...state,endingPlayed:true};
 render();if(state.phase==='victory'){ $('boss-actor').style.opacity='0';$('hostage').style.opacity='0';$('rescued-actor').hidden=false;void grandFinale.show(); }
}
$('answer-form').onsubmit=async e=>{
 e.preventDefault();if(busy||store.view().readOnly||store.view().state?.phase!=='active')return;
 const checked=submit(state,$('answer').value);if(checked===state)return;
 const visual=resolve(checked,checked.pending.token);
 if(visual.records[state.index].attempts.length===state.records[state.index].attempts.length){state=visual;render();return;}
 const round=store.view().state;
 if(!await commit({event:{id:eventId(),roundId:round.roundId,type:'answer',questionId:QUESTIONS[state.index].id,answer:$('answer').value.trim()}}))return;
 // Only an acknowledged first result can start the existing visual attack.
 if(visual.animation)update(visual);else update(structuredClone(store.view().state.battle));
};
$('symbols').onclick=e=>{const button=e.target.closest('[data-symbol]');if(!button||button.disabled)return;const input=$('answer'),edit=editWithSymbol(input.value,input.selectionStart,input.selectionEnd,button.dataset.symbol);input.value=edit.value;keyboard.restore(input,edit.caret);};
$('hint').onclick=()=>{if($('hint').disabled)return;$('feedback').textContent=QUESTIONS[state.index].hint;};
$('next').onclick=async()=>{
 if($('next').hidden||busy||store.view().readOnly)return;
 const round=store.view().state;if(!round)return;
 const old=state.index,type=round.phase==='awaiting-settlement'?'settle':'next';
 if(await commit({event:{id:eventId(),roundId:round.roundId,type}})){
  update(structuredClone(store.view().state.battle));render();
  if(old!==state.index)$('answer').focus({preventScroll:true});
 }
};
$('start').onclick=async()=>{
 if(state.phase!=='intro'||!assetsReady||busy||!store.view().canStart)return;
 if(!await commit({start:{roundId:eventId()}}))return;
 cancelScene();shownIndex=-1;update(structuredClone(store.view().state.battle));scrollTo({top:0,behavior:'auto'});$('battle-title').focus({preventScroll:true});
};
$('restart').onclick=()=>{};
for(const id of ['remediation','defeat-remediation'])$(id).onclick=async()=>{
 if(busy||store.view().learningReadOnly||!store.view().status.saved||!store.view().remediationEntry)return;
 const v=store.view();
 if(v.remediationEntry.action==='retry'){
  if(await commit({start:{roundId:eventId(),qualificationId:v.qualification.qualificationId,sourceRoundId:v.qualification.sourceRoundId}})){
   restoreSaved();scrollTo({top:0,behavior:'auto'});$('battle-title').focus({preventScroll:true});
  }
  return;
 }
 if(v.remediationEntry.action==='claim'){await commit({qualification:v.qualificationCandidate});return;}
 location.href='../unit-five/remediation.html';
};
$('reload-saved').onclick=async()=>{
 if(busy)return;busy=true;render();await loadAuthority();loaded=true;busy=false;restoreSaved();
};
$('reduced').onchange=()=>{if($('reduced').checked){hitEffects.reduce();for(const a of active)if(a.playState==='running')a.finish();}};
document.addEventListener('visibilitychange',()=>{hitEffects.setVisibility(document.hidden);for(const a of active)if(a.playState!=='finished'){if(document.hidden)a.pause();else a.play();}});
function resize(){document.documentElement.style.setProperty('--vh',(globalThis.visualViewport?.height||innerHeight)+'px');}addEventListener('resize',resize);globalThis.visualViewport?.addEventListener('resize',resize);resize();render();
try{validateBank();await Promise.all(Object.values(ASSETS).map(src=>{const image=new Image();image.src='../rescue-battle-demo/'+src;return image.decode();}));assetsReady=true;await loadAuthority();loaded=true;restoreSaved();}catch(e){update(transition(state,'assets-failed'));console.error('Prototype initialization failed',e);}
export const inspect=()=>({state:structuredClone(state),authority:store.view(),summary:score(state),animationStarts,activeAnimations:active.size,reduced:$('reduced').checked,history:structuredClone(history),attackStage,lastAttack:structuredClone(lastAttack),attackTraces:structuredClone(attackTraces),hitEffects:hitEffects.inspect()});
