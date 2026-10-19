import {grade} from '../marble-formal/state.js';
export function mountRemediationLinks(){
 const group=document.createElement('section'),heading=document.createElement('p'),link=document.createElement('a'),practice=document.createElement('a');
 group.setAttribute('aria-label','第二單元補強');heading.setAttribute('role','status');link.id='remediation-entry';link.href='../unit-two/remediation.html';link.textContent='前往指定補救練習（十題）';
 practice.href='../unit-two/';practice.textContent='根式乘除自主練習';practice.style.marginInline='1rem';group.append(heading,link,practice);document.getElementById('remediation-note').after(group);
 return view=>{const r=view.state,required=r?.phase==='settled'&&grade(r).status==='not-met';link.hidden=!required||view.readOnly||!!view.unlock;
  heading.textContent=view.status.code==='namespace-ownership-review-required'?'找到其他舊命名空間，無法安全判定歸屬，已停止寫入。請匯出紀錄供確認；原始資料未合併或刪除。':view.unlock?'補救已達標，已確認取得一次重新挑戰資格。開始新回合時才消耗。':required?`本次數學挑戰未達標：首次正確 ${grade(r).firstCorrect}／10。請完成根式乘除補救練習，再取得重新挑戰資格。`:'';
 };
}
