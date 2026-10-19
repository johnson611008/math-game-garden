export function createAudio(){let context=null,muted=false,available=true,last=-1,played=0;
 const silence=()=>{muted=true;available=false;};
 function unlock(){if(muted||!available)return;try{context??=new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(silence);}catch{silence();}}
 function play(kind){if(muted||!available||context?.state!=='running')return;const now=context.currentTime;if(now-last<.025)return;last=now;
  try{const osc=context.createOscillator(),gain=context.createGain(),hz={paddle:460,hit:620,break:820,wall:180,miss:110,win:1040,launch:300}[kind]||330;
   osc.type=kind==='paddle'?'triangle':'sine';osc.frequency.setValueAtTime(hz,now);osc.frequency.exponentialRampToValueAtTime(hz*.58,now+.11);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.17);osc.onended=()=>{osc.disconnect();gain.disconnect();};played++;
  }catch{silence();}}
 return {unlock,play,toggle(){muted=!muted;if(!muted)unlock();},read:()=>({muted,available,state:context?.state||'not-started',played})};
}
