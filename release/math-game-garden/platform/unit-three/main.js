import {browserStore} from '../bubble-formal/store.js';
import {grade} from '../bubble-formal/state.js';
import {summary,hintText} from './learning.js';
import {editWithSymbol} from '../src/ui/math-input.js';
import {mountMathKeyboard} from '../src/ui/math-keyboard-focus.js';
const $=id=>document.getElementById(id),mode=location.pathname.endsWith('/remediation.html')?'remediation':'practice',store=browserStore();
let view=store.view(),busy=false,selected=null,localDraft='',draftDirty=false;
for(const symbol of [...'1234567890','*','-','+','clear']){const b=document.createElement('button');b.type='button';b.dataset.symbol=symbol;b.textContent=({clear:'清除','*':'×','-':'−'})[symbol]||symbol;$('symbols').append(b);}
const keyboard=mountMathKeyboard(document,[$('answer')],$('symbols'));
const current=()=>view.learning.attempts.find(a=>a.attemptId===selected)||view.learning.attempts.filter(a=>a.mode===mode).at(-1),question=()=>current()?.questions[current().index];
const id=()=>crypto.randomUUID(),message=text=>$('message').textContent=text;
function renderReview(a){let box=$('review');if(!box){box=document.createElement('section');box.id='review';document.querySelector('main').append(box);}box.hidden=a?.status!=='completed';box.replaceChildren();if(box.hidden)return;const h=document.createElement('h2');h.textContent='本回合逐題回顧';box.append(h);for(const q of a.questions){const r=a.responses[q.id],p=document.createElement('p');p.textContent=`${q.text}；首次輸入：${r?.first?.answer??'未答'}；${r?.first?.result.accepted?'首次正確':r?.first?.result.equivalent?'等值但未最簡':'首次未正確'}；訂正：${!r?.first?.result.accepted&&r?.latest?.result.accepted?'成功':'無'}；提示 ${r?.hints.length??0} 次。解法：先將根號內的平方因數提出，再合併同類根式的係數；本題最簡答案 ${q.answer}。需留意：${conceptLabel(q.concept)}。`;box.append(p);}}
function render(){
 const a=current(),q=question(),s=a?summary(a):null,locked=busy||view.readOnly,source=view.state,open=view.learning.attempts.find(a=>a.mode===mode&&a.status!=='completed');
 $('mode').textContent=mode==='practice'?'一般自主練習｜每次十題，不限時，不產生挑戰資格。':'指定補救｜十題首次至少八題正確；訂正不回補首次成績。';
 $('save-status').textContent=busy?'交易確認中，尚未保存成功':view.readOnly?'停止寫入：'+view.status.code:draftDirty?'這份輸入尚未保存；換題、提交或暫停時保存。':`已確認保存 · 正式 revision ${view.revision} · 練習 revision ${view.learningRevision}`;
 $('new').disabled=locked||!!open||(mode==='remediation'&&(!source||source.phase!=='settled'||grade(source).status!=='not-met'||!!view.unlock));
 $('new').textContent=mode==='practice'?'開始新的十題練習':'開始新的指定補救';$('pause').disabled=locked||!a||a.status==='completed';$('pause').textContent=a?.status==='paused'?'繼續練習':'暫停並保存';
 $('workspace').hidden=!a;$('result').hidden=!a||a.status!=='completed';
 if(a){
  $('progress').textContent=`第 ${a.index+1}／10 題 · 已完成 ${s.resolved} 題${a.status==='paused'?'（暫停中）':''}`;$('progress-bar').value=s.resolved;$('question').textContent=q.text;
  $('answer').value=localDraft;$('answer').disabled=locked||a.status!=='in-progress';for(const b of $('symbols').querySelectorAll('button'))b.disabled=$('answer').disabled;
  $('submit').disabled=$('answer').disabled;$('hint').disabled=locked||a.status!=='in-progress';$('previous').disabled=locked||a.index===0||a.status==='completed';$('next').disabled=locked||a.index===9||a.status==='completed';
  const r=a.responses[q.id],last=r?.submissions.at(-1);$('feedback').textContent=last?last.result.accepted?'這次答案正確！'+(r.first?.result.accepted?'':'訂正成功，首次結果保留。'):last.result.status==='equivalent-not-simplest'?'數值等值，但尚未最簡。再找找可以提出或約分的部分。':last.result.consumesFirst?'再試試看，先檢查係數的乘除與根號內的運算。首次結果已保留。':last.result.message+' 這次不消耗首次作答。':'';
  $('hint-text').textContent=r?.hints.length?hintText(q,r.hints.at(-1).level):'';$('score').textContent=`首次正確 ${s.firstCorrect}／10 · 已有首次結果 ${s.count} 題 · ${s.rate===null?'尚未完成十題':s.rate+'%'}`;
  $('finish').hidden=a.status==='completed'||s.resolved!==10;$('finish').disabled=locked;
  if(a.status==='completed')$('result-text').textContent=`首次正確 ${s.firstCorrect}／10（${s.rate}%）；需要加強：${s.wrongConcepts.map(conceptLabel).join('、')||'持續練習'}。`+(a.mode==='practice'?'這是自主練習，不產生解鎖資格。':a.unlockId?(view.learning.grants.find(g=>g.unlockId===a.unlockId)?.usedByRoundId?'本次一次性資格已使用。':'補救已達標，已確認核發一次重新挑戰資格。'):'本次補救未達標，可以開始新的補救回合。');
 }
 renderReview(a);
 $('history').replaceChildren(...view.learning.attempts.filter(a=>a.mode===mode).map(a=>{const li=document.createElement('li'),b=document.createElement('button'),s=summary(a);b.textContent=`${a.startedAt.slice(0,10)} · ${a.status==='completed'?'已完成':a.status==='paused'?'暫停中':'進行中'} · 首次 ${s.firstCorrect}/10`;b.disabled=busy;b.onclick=()=>{if(draftDirty){message('請先提交、換題或暫停，保存目前輸入後再查看歷史。');return;}selected=a.attemptId;localDraft=a.drafts[a.questions[a.index].id]||'';render();};li.append(b);return li;}));
 if(mode==='remediation'&&!a&&!open)message(view.readOnly?'資料尚未安全確認，請先匯出紀錄。':view.unlock?'已取得一次資格，請返回泡泡派對。':source?.phase!=='settled'?'請先完成並明確結算原挑戰；未完成回合應優先恢復。':grade(source).status!=='not-met'?'目前沒有需要補救的正式回合。':'開始補救後，會綁定目前未達標的正式回合。');
}
function conceptLabel(code){return ({COMBINE_LIKE_RADICALS:'\u540c\u985e\u6839\u5f0f\u5408\u4f75',SUBTRACT_COEFFICIENTS:'\u4fc2\u6578\u76f8\u6e1b',SIMPLIFY_BEFORE_COMBINING:'\u5148\u5316\u7c21\u518d\u5408\u4f75',SIGNS_AND_LIKE_TERMS:'\u6e1b\u865f\u8207\u540c\u985e\u9805',SIMPLIFY_AND_SIGNS:'\u5316\u7c21\u8207\u6b63\u8ca0\u865f'})[code]||'\u6aa2\u67e5\u6700\u7c21\u5f62\u5f0f';}
async function send(type,more={}){if(busy||view.readOnly)return false;busy=true;render();const event={id:id(),type,at:new Date().toISOString(),...(current()?{attemptId:current().attemptId}:{}),...more};const result=await store.commit({learning:event});view=store.view();busy=false;if(!result.saved){message('尚未保存，已停止後續寫入：'+result.code);render();return false;}draftDirty=false;localDraft=current()?.drafts[question()?.id]||'';message('');render();return true;}
async function saveDraft(){if(!draftDirty)return true;return send('draft',{questionId:question().id,answer:localDraft});}
async function load(){if(busy)return;busy=true;render();view=await store.load();busy=false;selected=view.learning.attempts.find(a=>a.mode===mode&&a.status!=='completed')?.attemptId||null;localDraft=current()?.drafts[question()?.id]||'';draftDirty=false;render();}
localDraft='';$('answer').oninput=e=>{localDraft=e.target.value;draftDirty=true;$('save-status').textContent='目前輸入尚未保存；提交、換題或暫停時保存。';};
$('answer-form').onsubmit=async e=>{e.preventDefault();await send('submit',{questionId:question().id,answer:localDraft});};
$('symbols').onclick=e=>{const b=e.target.closest('[data-symbol]');if(!b||b.disabled)return;const input=$('answer'),edit=editWithSymbol(input.value,input.selectionStart,input.selectionEnd,b.dataset.symbol);localDraft=edit.value;draftDirty=true;input.value=edit.value;keyboard.restore(input,edit.caret);$('save-status').textContent=edit.error||'目前輸入尚未保存。';};
$('hint').onclick=async()=>{if(!await saveDraft())return;const q=question(),levels=current().responses[q.id]?.hints||[];await send('hint',{questionId:q.id,level:levels.length?2:1});};
for(const [name,delta]of [['previous',-1],['next',1]])$(name).onclick=async()=>{if(!await saveDraft())return;await send('navigate',{index:current().index+delta});};
$('pause').onclick=async()=>{if(!await saveDraft())return;await send(current().status==='paused'?'resume':'pause');};
$('finish').onclick=()=>send('finish-practice');
$('new').onclick=async()=>{selected=null;const attemptId=id();const ok=await send('begin-practice',{attemptId,mode,seed:crypto.getRandomValues(new Uint32Array(1))[0],...(mode==='remediation'?{remediationId:id(),sourceRoundId:view.state?.roundId}:{})});if(ok){selected=attemptId;localDraft='';render();}};
$('reload').onclick=load;
$('export').onclick=async()=>{const blob=new Blob([JSON.stringify({challengeRaw:await store.exportRaw().catch(e=>({error:e.message})),learningRaw:await store.exportLearning().catch(e=>({error:e.message})),namespaceAudit:store.namespaceAudit(),unconfirmedDraft:draftDirty?{attemptId:current()?.attemptId,questionId:question()?.id,answer:localDraft}:null},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='unit-three-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('beforeunload',e=>{if(draftDirty||busy){e.preventDefault();e.returnValue='';}});
load();
