import {grade} from './state.js';
// The caller supplies an independent, freshly decoded storage read, never UI text.
export async function verifyOutcome(readAuthority,{roundId,revision=0}={}){
 const v=await readAuthority(),r=v.state;
 if(v.pending||!v.status?.saved||v.readOnly)throw Error('victory-authority-not-confirmed');
 if(!r||r.roundId!==roundId||v.revision<revision)throw Error('victory-round-or-revision-mismatch');
 const g=grade(r),settlement=r.events.at(-1);
 const settled=r.phase==='settled'&&r.stages.length===5&&r.stages.every(s=>s.completed)&&g.count===10&&settlement?.type==='settle'&&!!r.settledAt;
 return {eligible:settled&&g.status==='passed',needsRemediation:settled&&g.status==='not-met',roundId:r.roundId,revision:v.revision,firstCorrect:g.firstCorrect,settled};
}
