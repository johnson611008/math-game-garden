// Presentation geometry only. No grading, HP, questions or result mutations.
export const STAGES=Object.freeze([{id:'windup',duration:250},{id:'dash',duration:300},{id:'impact',duration:200},{id:'return',duration:450}]);
const ALPHA={hero:[119/768,173/768,642/768,705/768],boss:[15/1536,1/1024,1517/1536,1014/1024]};
export function visibleBox(rect,kind){const b=ALPHA[kind];return {left:rect.x+rect.width*b[0],right:rect.x+rect.width*b[2],top:rect.y+rect.height*b[1],bottom:rect.y+rect.height*b[3]};}
export function planAttack({width,height,hero,boss},kind,reduced=false){
 if(!(width>0&&height>0))throw Error('invalid-stage-geometry');
 const direction=kind==='hero'?1:-1,attacker=kind==='hero'?hero:boss,victim=kind==='hero'?boss:hero;
 const a=visibleBox(attacker,kind),v=visibleBox(victim,kind==='hero'?'boss':'hero');
 const gap=direction>0?v.left-a.right:a.left-v.right;
 const padding=Math.min(9,width*.025),distance=reduced?0:Math.max(0,gap-padding);
 const backRoom=direction>0?a.left:width-a.right;
 const windup=reduced?0:Math.max(0,Math.min(width*.024,backRoom-3));
 const recoilRoom=direction>0?width-v.right:v.left;
 const recoil=reduced?0:Math.max(0,Math.min(width*.048,recoilRoom-3));
 const impact={x:direction>0?v.left+(v.right-v.left)*.18:v.right-(v.right-v.left)*.18,y:v.top+(v.bottom-v.top)*.53};
 const charge={x:attacker.x+attacker.width*(kind==='hero'?.29:.80),y:attacker.y+attacker.height*(kind==='hero'?.49:.20)};
 return {kind,direction,width,height,attacker,victim,visibleAttacker:a,visibleVictim:v,distance,windup,recoil,
  dash:direction*distance,back:-direction*windup,kick:direction*recoil,impact,charge,padding,contactGap:gap-distance,reduced,
  duration:STAGES.reduce((sum,s)=>sum+(reduced?40:s.duration),0)};
}
export function endingView(summary){
 if(summary.completed!==10||summary.firstCount!==10)return null;
 return {correct:summary.firstCorrect,hp:summary.heroHP,total:10,success:summary.heroHP>=7};
}
