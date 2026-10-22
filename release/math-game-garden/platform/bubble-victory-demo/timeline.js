export const DURATION=9;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-(1-clamp(x))**3;
export function scene(time,{reduced=false}={}){
 const t=clamp(time,0,DURATION),end=t>=DURATION,phase=t<2?'entrance':t<4?'trio':t<6?'mole':'celebration';
 const bases={red:200,blue:400,pink:600,mole:805},actors=[];
 for(const name of ['red','blue','pink','mole']){
  const isMole=name==='mole',arrival=isMole?clamp((t-4)/1):clamp((t-({red:0,blue:.2,pink:.4}[name]))/1.45),dance=Math.max(0,t-(isMole?5:2));
  const base=bases[name],cycle=Math.floor(dance*3),frames={red:[1,2,4,5],blue:[1,2,5,6],pink:[0,1,2,3],mole:[1,3,6,7]};
  let frame=end?{red:7,blue:7,pink:8,mole:7}[name]:frames[name][cycle%frames[name].length];
  if(t<2&&!isMole)frame=name==='blue'?[0,3,4,5,0][Math.min(4,Math.floor(arrival*5))]:name==='red'?[0,1,2][Math.min(2,Math.floor(arrival*3))]:[0,1,3][Math.min(2,Math.floor(arrival*3))];
  if(reduced)frame={red:7,blue:7,pink:8,mole:7}[name];
  const active=dance>0&&!end,hop=active&&!reduced?Math.abs(Math.sin(dance*Math.PI*(name==='pink'?2:3)))*(name==='red'?20:9):0;
  const startX=name==='red'?-150:name==='blue'?1120:730;
  const x=reduced||isMole?base:startX+(base-startX)*ease(arrival);
  const y=455-hop-(t<2&&!reduced&&!isMole?Math.sin(arrival*Math.PI)*30:0);
  actors.push({name,x,y,frame,opacity:reduced?clamp(arrival*3):1,visible:isMole?t>=4:t>=({red:0,blue:.2,pink:.4}[name]),reveal:isMole?ease(arrival):1,tilt:active&&!reduced?Math.sin(dance*5+(isMole?1:0))*.035:0});
 }
 return {time:t,phase,end,actors,confetti:t>=6&&!end&&!reduced,stars:t>=2&&!end,title:t>=6||end,hole:t>=4};
}
export class DanceClock{
 constructor(){this.time=0;this.state='ready';this.startedAt=null;this.endedAt=null;}
 play(now){this.time=0;this.state='playing';this.startedAt=now;this.endedAt=null;}
 update(now){if(this.state==='playing'){this.time=clamp((now-this.startedAt)/1000,0,DURATION);if(this.time===DURATION){this.state='ended';this.endedAt=now;}}return this.time;}
 skip(){if(this.state==='playing'){this.time=DURATION;this.state='ended';}return this.time;}
}
