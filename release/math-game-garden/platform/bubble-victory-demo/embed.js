// Presentation-only bridge. It cannot access any game store or award anything.
export function installEmbedding({ready,play,encourage,dispose,setReduced}){
 if(parent===window)return {ended(){},ready(){}};
 let nonce=null,initialized=false;
 addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||!e.data)return;const d=e.data;
  if(d.type==='victory-init'&&!initialized&&ready()&&typeof d.nonce==='string'&&['play','encourage'].includes(d.mode)){
   initialized=true;nonce=d.nonce;setReduced(!!d.reduced);if(d.mode==='play')play();else encourage();parent.postMessage({type:'victory-started',nonce},location.origin);
  }else if(initialized&&d.type==='victory-dispose'&&d.nonce===nonce)dispose();
 });
 return {ended(){if(nonce)parent.postMessage({type:'victory-finished',nonce},location.origin);},ready(){parent.postMessage({type:'victory-ready'},location.origin);}};
}
