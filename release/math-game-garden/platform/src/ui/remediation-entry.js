// Presentation only. Callers supply a decoded store view; this module grants no authority.
export function remediationGuidance(view,{required,roundId}){
 const safe=()=>({state:'unsafe',text:'補救紀錄尚未安全確認，請重新讀取原紀錄；目前不能確認重新挑戰資格。',action:null});
 if(view.pending||view.status?.code==='loading')return {state:'loading',text:'正在確認已保存的補救紀錄…',action:null};
 if(view.readOnly||view.status?.saved!==true)return safe();
 if(!required)return {state:'hidden',text:'',action:null};
 if(!roundId||!Array.isArray(view.learning?.attempts)||!Array.isArray(view.learning?.grants))return safe();
 const attempts=view.learning.attempts.filter(a=>a.mode==='remediation'&&a.sourceRoundId===roundId),open=attempts.filter(a=>a.status!=='completed');
 if(open.length>1)return safe();
 if(view.unlock){const g=view.unlock,a=attempts.find(a=>a.attemptId===g.attemptId);if(g.sourceRoundId!==roundId||g.usedByRoundId!==null||a?.status!=='completed'||a.unlockId!==g.unlockId||!view.learning.grants.some(x=>x.unlockId===g.unlockId&&x.sourceRoundId===roundId&&x.usedByRoundId===null))return safe();
  return {state:'qualified',text:'補救已達標，可以重新挑戰。開始新回合時仍會驗證並消耗一次性資格。',action:null};}
 const a=open[0]||attempts.at(-1);
 if(!a)return {state:'required',text:'需要完成指定補救練習，首次至少 8／10 才能取得重新挑戰資格。',action:'開始指定補救'};
 const records=a.attempt?.responses??a.responses;if(!records||typeof records!=='object')return safe();const count=Object.values(records).filter(r=>r.first).length;
 if(count>10)return safe();
 if(a.status!=='completed')return {state:'unfinished',text:'你還有補救練習尚未完成',progress:`已確認保存 ${count}／10 題`,action:'繼續補救練習'};
 if(a.unlockId)return safe();
 return {state:'failed',text:'本次補救未達標，原首次成績已保留。',progress:`已確認保存 ${count}／10 題`,action:'重新進行補救'};
}
export function mountRemediationEntry({anchor,href,linkId='continue-remediation',existingLink=null}){
 const doc=anchor.ownerDocument,box=doc.createElement('section'),text=doc.createElement('p'),progress=doc.createElement('p'),link=existingLink||doc.createElement('a');
 box.id='remediation-guidance';box.hidden=true;box.setAttribute('aria-label','指定補救進度');box.setAttribute('aria-live','polite');box.style.cssText='margin:12px 0;padding:12px;border:2px solid #8b632d;border-radius:12px;background:#fff1cf;color:#392819;';
 text.style.margin='0 0 6px';progress.style.margin='0 0 8px';link.id=linkId;link.href=href;link.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:6px 16px;background:#315d42;color:white;border-radius:10px;font-weight:bold;text-decoration:none;';box.append(text,progress,link);anchor.after(box);
 return (view,context)=>{const model=remediationGuidance(view,context);box.dataset.state=model.state;box.hidden=model.state==='hidden';text.textContent=model.text;progress.textContent=model.progress||'';progress.hidden=!model.progress;link.hidden=!model.action;link.style.display=model.action?'inline-flex':'none';link.textContent=model.action||'';return model;};
}
