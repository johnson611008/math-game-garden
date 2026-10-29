import {mountAdmissionNotice} from '../src/ui/admission-notice.mjs';
import {browserStore} from '../rescue-battle-formal/store.mjs';
import {summary} from './learning.mjs';import {hintText} from './bank.mjs';
import {pretty} from '../rescue-battle-demo/questions.mjs';
import {editWithSymbol} from '../src/ui/math-input.js';import {mountMathKeyboard} from '../src/ui/math-keyboard-focus.js';
const $=id=>document.getElementById(id),store=browserStore();let view=store.view(),busy=true,selected=null,draft='',dirty=false,message='';
const admissionUI=mountAdmissionNotice({reload:()=>load(),isBusy:()=>busy});
for(const symbol of ['7','8','9','√','backspace','4','5','6','×','÷','1','2','3','+','−','0','(',')','/','clear']){const b=document.createElement('button');b.type='button';b.dataset.symbol=symbol;b.textContent=({backspace:'刪除',clear:'清除','/':'分數'})[symbol]||symbol;b.setAttribute('aria-label',({backspace:'刪除游標前一字',clear:'清除答案','/':'分數斜線','√':'輸入根號'})[symbol]||symbol);$('symbols').append(b);}
const keyboard=mountMathKeyboard(document,[$('answer')],$('symbols'));
const current=()=>view.learning.attempts.find(a=>a.attemptId===selected)||view.learning.attempts.filter(a=>a.sourceRoundId===view.state?.roundId).at(-1);
const question=()=>current()?.questions[current().index];
function questionView(q){$('question').replaceChildren();$('question').setAttribute('aria-label',q.text);if(q.denominator){const f=document.createElement('span');f.className='fraction';for(const [klass,text]of [['num',q.numerator],['den',q.denominator]]){const e=document.createElement('span');e.className=klass;e.textContent=pretty(text);f.append(e);}$('question').append(f);}else $('question').textContent=q.text;}
function render(){admissionUI(view.admission);const a=current(),q=question(),s=a?summary(a):null,locked=busy||view.learningReadOnly,legal=view.state?.phase==='settled'&&view.state.settlement?.status==='not-met',latest=view.learning.attempts.filter(a=>a.sourceRoundId===view.state?.roundId).at(-1);
 $('save-status').textContent=busy?'交易確認中，尚未確認保存':view.learningReadOnly?'安全停止：'+view.status.code:dirty?'這份輸入尚未提交保存':`已確認保存 · 練功 revision ${view.learningRevision}`;
 $('message').textContent=message||(!legal?'只有正式十題已結算且救援失敗的回合，才能開始指定補救。':view.remediationEntry?.message||'');
 $('new').disabled=locked||!legal||!!latest&&(latest.status!=='completed'||summary(latest).status==='passed');$('new').textContent=latest?'重新練功':'開始補救練功';if(latest&&summary(latest).status==='passed')$('new').textContent='練功已達標';
 $('reload').disabled=busy;$('workspace').hidden=!a||a.status==='completed';$('result').hidden=!a||a.status!=='completed';
 if(a){const accepted=!!a.responses[q.id]?.latest?.result.accepted,response=a.responses[q.id];$('progress').textContent=`第${a.index+1}／10題 · 已保存完成 ${s.resolved}／10`;$('concept').textContent=q.concept;questionView(q);$('answer').value=draft;$('answer').disabled=locked||a.status==='completed'||accepted;for(const b of $('symbols').querySelectorAll('button'))b.disabled=$('answer').disabled;document.querySelector('.keyboard-mode').disabled=$('answer').disabled;$('submit').disabled=$('answer').disabled;$('hint').disabled=$('answer').disabled;
 $('submit').hidden=accepted;$('hint').hidden=accepted;$('next').hidden=a.index===9;
 $('next').disabled=locked||!accepted||a.index===9||a.status==='completed';$('finish').hidden=s.resolved!==10||a.status==='completed';$('finish').disabled=locked;
 $('answer-kind').textContent=accepted?'本題已保存完成':response?.first?'訂正 · 不回補首次':'首次作答';
 const last=response?.latest;$('feedback').textContent=last?last.result.accepted?'答案正確並已保存。'+(response.first?.result.accepted?'':'訂正成功，首次結果不變。'):last.result.consumesFirst?'再想一想，首次結果已保留。'+hintText(q):'輸入無法判讀，本次不消耗首次成績。':'';
 $('hint-text').textContent=response?.hints.length?hintText(q):'';$('score').textContent=`已保存首次正確 ${s.firstCorrect}／10 · 首次結果 ${s.count}／10`;
 if(a.status==='completed'){$('result-title').textContent=s.status==='passed'?'練功達標':'繼續修練，再出發';$('result-text').textContent=`首次正確 ${s.firstCorrect}／10`; const g=view.qualifications.grants.find(g=>g.attemptId===a.attemptId),valid=!!g&&!g.usedByRoundId&&g.sourceRoundId===view.state?.roundId&&!locked;
 $('qualification-note').textContent=s.status!=='passed'?'本次練功未達標，請重新練功。訂正不回補首次成績；本次紀錄已保存。':!view.status.saved?'資格尚未確認保存，請重新讀取。':g?.usedByRoundId?'本次資格已使用，原補救成果維持唯讀。':valid?'練功達標，一次性重新挑戰資格已確認保存。':'資格尚未確認，請重新讀取；不會重新要求已達標的練功。';
 $('rechallenge').hidden=!(valid||g?.usedByRoundId&&view.state?.phase!=='settled');$('rechallenge').disabled=locked;$('rechallenge').textContent=valid?'重新挑戰 Boss':'繼續 Boss 決戰';}}
 $('history').replaceChildren(...view.learning.attempts.map(a=>{const li=document.createElement('li'),b=document.createElement('button');b.textContent=`第${view.learning.attempts.indexOf(a)+1}次 · ${a.status==='completed'?'已完成':'進行中'} · 首次${summary(a).firstCorrect}／10`;b.disabled=busy;b.onclick=()=>{if(dirty){message='請先提交未保存文字，或使用重新讀取確認捨棄後再查看歷史。';render();return;}selected=a.attemptId;draft='';render();};li.append(b);return li;}));
 $('review').replaceChildren(...(a?.status==='completed'?a.questions.map((q,i)=>{const li=document.createElement('li'),r=a.responses[q.id];li.textContent=`第${i+1}題 ${q.text}｜首次${r.first.result.accepted?'正確':'錯誤'}；${r.first.result.accepted?'不需訂正':'訂正已完成，首次結果保留'}`;return li;}):[]));
}
async function send(type,extra={}){if(busy||view.learningReadOnly)return false;const a=current(),command={learning:{id:crypto.randomUUID(),type,...(a?{attemptId:a.attemptId,sourceRoundId:a.sourceRoundId}:{}),...extra}};busy=true;render();const result=await store.commit(command);view=store.view();busy=false;if(!result.saved){message='尚未確認保存，已停止寫入：'+result.code;render();return false;}dirty=false;message='';render();return true;}
async function load(){if(!busy&&dirty&&!confirm('未提交文字尚未保存，重新讀取會捨棄這份文字。'))return;busy=true;render();view=await store.load();if(view.status.saved&&!view.learningReadOnly&&view.qualificationCandidate){await store.commit({qualification:view.qualificationCandidate});view=store.view();}busy=false;selected=view.learning.attempts.filter(a=>a.sourceRoundId===view.state?.roundId).at(-1)?.attemptId||null;draft='';dirty=false;message=view.status.saved?'':'讀取異常，未解鎖任何挑戰：'+view.status.code;render();}
 $('answer').oninput=e=>{draft=e.target.value;dirty=true;$('save-status').textContent='這份輸入尚未提交保存';};
 $('symbols').onclick=e=>{const b=e.target.closest('[data-symbol]');if(!b||b.disabled)return;const input=$('answer'),edit=editWithSymbol(input.value,input.selectionStart,input.selectionEnd,b.dataset.symbol);draft=edit.value;dirty=true;input.value=draft;keyboard.restore(input,edit.caret);$('save-status').textContent='這份輸入尚未提交保存';};
 $('answer-form').onsubmit=async e=>{e.preventDefault();if(!draft.trim()||!question())return;await send('submit',{questionId:question().id,answer:draft.trim()});};
 $('hint').onclick=()=>{if(!question()||$('hint').disabled)return;void send('hint',{questionId:question().id});};$('next').onclick=async()=>{if($('next').disabled)return;if(await send('next')){draft='';render();}};$('finish').onclick=()=>{if(!$('finish').disabled)void send('finish');};
 $('new').onclick=async()=>{if($('new').disabled)return;const attemptId=crypto.randomUUID();if(await send('begin',{attemptId,sourceRoundId:view.state?.roundId,remediationId:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]})){selected=attemptId;draft='';render();}};$('reload').onclick=load;
addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
$('rechallenge').onclick=()=>{if(!busy&&!view.learningReadOnly&&!$('rechallenge').hidden)location.href='../rescue-battle-formal/';};
load();export const inspect=()=>({view:store.view(),busy,selected,draftDirty:dirty});
