import {grade} from '../marble-formal/state.js';
import {mountRemediationEntry} from '../src/ui/remediation-entry.js';
export function mountRemediationLinks(){
 const practice=document.createElement('a');practice.href='../unit-two/';practice.textContent='根式乘除自主練習';document.getElementById('remediation-note').after(practice);
 const update=mountRemediationEntry({anchor:document.getElementById('save-status'),href:'../unit-two/remediation.html',linkId:'remediation-entry'});
 return view=>{const r=view.state;update(view,{required:r?.phase==='settled'&&grade(r).status==='not-met',roundId:r?.roundId});};
}
