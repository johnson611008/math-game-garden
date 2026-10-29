import{POLICY as FINAL_POLICY,finalView}from './final-answer.js';
import {browserStore} from './store.js';
import {summary,stateOf,blank} from './remediation.js';
import {liveTemplate,renderLive} from '../src/practice-live/view.js';
import {practiceSummary} from '../src/practice-live/session.js';
import {mountMathKeyboard} from '../src/ui/math-keyboard-focus.js';
import {editWithSymbol} from '../src/ui/math-input.js';
const $=id=>document.getElementById(id),root=$('app'),store=browserStore();let view=store.view(),busy=false,selected=null,lastInput='answer-input',local=null,error='';
root.innerHTML=liveTemplate();root.querySelector('.records-tools').remove();root.querySelector('.demo-notice').innerHTML='<strong>化為最簡根式</strong><span>直接輸入答案；首次答對 8／10 可取得一次重挑資格。</span>';
$('practice-title').textContent='根式化簡指定補救';root.querySelector('.demo-tag').textContent='指定補救';root.querySelector('#completion-view > p').textContent='這是綁定原挑戰的補救紀錄；首次結果永久保留。';
const keyboard=mountMathKeyboard(root,root.querySelectorAll('input[data-field]'),$('symbol-keypad'));
const current=()=>view.learning.attempts.find(a=>a.attemptId===selected)||view.learning.attempts.at(-1),question=()=>current()?.attempt.questions[current().index];
const dirty=()=>!!current()&&!!local&&JSON.stringify(local)!==JSON.stringify(current().drafts[current().index]);
function adopt(){const a=current();local=a?structuredClone(a.drafts[a.index]):blank();}
function render(){const a=current(),locked=busy||view.readOnly;
 $('remediation-status').textContent=busy?'交易確認中，尚未確認保存':view.readOnly?'停止寫入：'+view.status.code:dirty()?'目前修改尚未保存。':`已確認保存 · 挑戰 revision ${view.revision} · 補救 revision ${view.learningRevision}`;
 $('begin-remediation').disabled=locked||view.learning.attempts.some(x=>x.status!=='completed')||!!view.unlock||!view.state?.settlement?.needsRemediation;
 $('pause-remediation').disabled=locked||!a||a.status==='completed'||a.attempt.status==='completed';$('pause-remediation').textContent=a?.attempt.status==='paused'?'繼續補救':'暫停並保存';$('reload-remediation').disabled=busy;
 $('remediation-message').textContent=error||(!view.state?.settlement?.needsRemediation?'請先完成並正式結算未達標的打地鼠挑戰；一般練習不產生資格。':view.unlock?'補救已達標，已確認取得一次資格；返回打地鼠開始新回合時才消耗。':a?.status==='completed'?`本次補救首次 ${summary(a).firstCorrect}／10，${a.unlockId?'已取得一次資格（可能已使用），歷史維持唯讀。':'未達標，可開始新的補救回合。'}`:'');
 root.hidden=!a;if(a){const state=stateOf(a);state.drafts[a.index]=local||state.drafts[a.index];state.drafts[a.index].dirty=dirty();
  const hints=(a.attempt.responses[question().id]?.hints||[]).filter(h=>h.level<3);renderLive(root,finalView(state),[],practiceSummary(state),error);$('question-instruction').textContent='請將下列根式化為最簡根式。';$('question-title').textContent='最簡根式';$('station-tag').hidden=true;$('input-guide').textContent='使用下方數學鍵盤輸入最終答案。';root.querySelector('.question-meta > span:last-child').textContent='指定補救';root.querySelector('.gentle-note').hidden=true;root.querySelector('.question-navigation p').textContent='答對並完成訂正後，前往下一題。';root.querySelector('.practice-heading .eyebrow').textContent='單元 01 · 指定補救';$('round-view').setAttribute('aria-label','十題指定補救');$('hint-button').hidden=true;$('solution-button').hidden=true;const response=a.attempt.responses[question().id];if(response?.latest&&!response.latest.accepted)$('answer-feedback').textContent='再找找根號內的平方因數，提出後確認根號內已不能再化簡。';
  $('restart-button').textContent='開始新的指定補救';$('restart-button').disabled=$('begin-remediation').disabled;
  $('next-button').textContent=a.index===9?'確認補救結果並檢查資格':'下一題 →';
  if(a.status==='completed'){for(const b of root.querySelectorAll('button'))if(b.id!=='restart-button')b.disabled=true;$('review-button').hidden=true;}
  for(const b of root.querySelectorAll('input,button'))if(locked)b.disabled=true;
  for(const b of $('symbol-keypad').querySelectorAll('button'))b.disabled=locked||a.attempt.status!=='in-progress';
  root.querySelector('.keyboard-mode').disabled=locked;
 }
 const chosen=current()?.attemptId;$('remediation-history').replaceChildren(...view.learning.attempts.map(a=>{const o=document.createElement('option');o.value=a.attemptId;o.textContent=`${a.startedAt.slice(0,10)} · ${a.status==='completed'?'已完成':'未完成'} · 首次 ${summary(a).firstCorrect}/10`;return o;}));if(chosen)$('remediation-history').value=chosen;$('remediation-history').disabled=busy;
}
async function send(type,extra={}){if(busy||view.readOnly)return false;busy=true;render();const e={id:crypto.randomUUID(),at:new Date().toISOString(),type,...(current()?{attemptId:current().attemptId}:{}),...extra};const result=await store.commit({learning:e});view=store.view();busy=false;error=result.saved?'':'未確認保存，已停止寫入：'+result.code;if(result.saved)adopt();render();return result.saved;}
async function flush(){if(!current()||!dirty())return true;const draft=structuredClone(local);for(const key of Object.keys(draft)){if(key==='dirty'||draft[key]===current().drafts[current().index][key])continue;if(!await send('draft',{questionId:question().id,field:key,value:draft[key]})){local=draft;render();return false;}}return true;}
async function begin(){selected=null;const attemptId=crypto.randomUUID();if(await send('begin-remediation',{attemptId,remediationId:crypto.randomUUID(),sourceRoundId:view.state?.id,questionPolicy:FINAL_POLICY,seed:crypto.randomUUID()})){selected=attemptId;adopt();render();}}
async function load(){if(busy)return;busy=true;render();view=await store.load();busy=false;selected=view.learning.attempts.find(a=>a.status!=='completed')?.attemptId||null;error='';adopt();render();}
root.addEventListener('focusin',e=>{if(e.target.dataset.field)lastInput=e.target.id;});
root.addEventListener('input',e=>{if(e.target.dataset.field&&!busy){local[e.target.dataset.field]=e.target.value;error='';render();}});
root.addEventListener('change',e=>{if(e.target.name==='judgment'&&!busy){local.judgment=e.target.value==='yes';error='';render();}});
root.addEventListener('submit',async e=>{e.preventDefault();if(await flush())await send('submit',{questionId:question().id,finalOnly:true});});
root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled||busy||b.type==='submit'||b.classList.contains('keyboard-mode'))return;
 if(b.dataset.symbol!==undefined){let input=$(lastInput);if(!input||input.closest('[hidden]'))input=$('answer-input');const edit=editWithSymbol(input.value,input.selectionStart,input.selectionEnd,b.dataset.symbol);local[input.dataset.field]=edit.value;error=edit.error;render();keyboard.restore(input,edit.caret);return;}
 if(b.id==='restart-button'){await begin();return;}if(!await flush())return;
 if(b.id==='hint-button'){const hints=current().attempt.responses[question().id]?.hints||[];await send('hint',{questionId:question().id,level:hints.some(h=>h.level===1)?2:1});}
 else if(b.id==='solution-button')await send('view-solution',{questionId:question().id,confirmed:true});
 else if(b.id==='check-multiplier'||b.id==='check-synchronized')await send('practice-step',{questionId:question().id,step:b.id==='check-multiplier'?'multiplier':'synchronized'});
 else if(b.id==='next-button'&&current().index===9)await send('finish-remediation');
 else if(b.id==='previous-button'||b.id==='next-button'||b.dataset.question!==undefined)await send('navigate',{index:b.dataset.question!==undefined?Number(b.dataset.question):current().index+(b.id==='next-button'?1:-1)});
});
$('begin-remediation').onclick=begin;$('reload-remediation').onclick=load;$('pause-remediation').onclick=async()=>{if(await flush())await send(current().attempt.status==='paused'?'resume':'pause');};
$('remediation-history').onchange=e=>{if(dirty()){error='請先保存目前輸入，再查看歷史。';render();return;}selected=e.target.value;adopt();render();};
$('export-remediation').onclick=async()=>{const raw={challenge:await store.exportRaw(),remediation:await store.exportLearning(),unconfirmed:dirty()?local:null};const url=URL.createObjectURL(new Blob([JSON.stringify(raw,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='mole-remediation-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('click',async e=>{const a=e.target.closest('a[data-leave],a[data-home]');if(!a)return;e.preventDefault();if(!await flush())return;if(current()?.attempt.status==='in-progress'&&!await send('pause'))return;location.href=a.hasAttribute('data-home')?'../game-garden/':a.href;});
window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});load();
