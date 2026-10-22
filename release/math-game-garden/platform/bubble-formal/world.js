import {BubbleGame,cell,key,neighbors,STEP,R,ROW,FAIL} from '../bubble-demo/engine.js';
import {STAGES,slotIds} from './stages.js';
import {SlotMath} from './session.js';
export class FormalWorld extends BubbleGame{
 constructor(seed){super(seed);}
 reset(seed=this.seed){super.reset(seed);this.math=null;this.phase='ready';this.queue=[];this.activeMarker=null;this.ability=null;this.markers=[];return this;}
 start(){const ok=super.start();if(ok)this.phase='play';return ok;}
 queueMarker(m){if(!m||m.state!=='waiting')return false;m.state='queued';this.queue.push(m.id);return true;}
 attach(hit){const direct=hit&&this.markers.find(m=>m.r===hit.r&&m.c===hit.c&&m.state==='waiting');const before=new Set(this.grid.keys());super.attach(hit);this.queueMarker(direct);for(const m of this.markers)if(before.has(key(m.r,m.c))&&!this.grid.has(key(m.r,m.c)))this.queueMarker(m);
  if(this.queue.length){this.beginNext();this.accumulator=STEP;}
 }
 beginNext(){if(this.math.activeId||!this.queue.length)return false;const id=this.queue.shift(),marker=this.markers.find(m=>m.id===id);if(!this.math.start(id))throw Error('invalid-task-binding');marker.state='active';this.activeMarker=marker;this.phase='math';this.status='playing';this.paused=true;return true;}
 update(dt){if(this.phase==='play')super.update(dt);}
 pause(){if(this.phase!=='play')return false;return super.pause();}
 shoot(direction){return this.phase==='play'&&super.shoot(direction);}
 submit(questionId,answer,eventId){if(this.phase!=='math')return {accepted:false,code:'not-answering'};const result=this.math.submit(questionId,answer,eventId);if(result.accepted&&result.taskFinished){this.activeMarker.state=result.outcome;if(result.correct)this.activate(this.activeMarker);this.phase='recovering';this.paused=true;}return result;}
 activate(marker){const center=key(marker.r,marker.c),radius=marker.kind==='simplify'?2:1;let selected=new Set([center]);
  if(marker.kind==='cancel'){const starts=[center,...neighbors(marker.r,marker.c).map(([r,c])=>key(r,c))];selected=this.flood(starts,b=>b.color===marker.color);}
  else for(let i=0;i<radius;i++)for(const k of [...selected]){const [r,c]=k.split(':').map(Number);for(const [rr,cc]of neighbors(r,c))selected.add(key(rr,cc));}
  const before=new Set(this.grid.keys()),popped=[],fallen=[];for(const k of selected){const b=this.grid.get(k);if(b){popped.push({...b,...cell(b.r,b.c,this.offset)});this.grid.delete(k);}}
  const supported=this.flood([...this.grid.values()].filter(b=>b.r===0).map(b=>key(b.r,b.c)),()=>true);for(const [k,b]of this.grid)if(!supported.has(k)){fallen.push({...b,...cell(b.r,b.c,this.offset)});this.grid.delete(k);}
  for(const m of this.markers)if(before.has(key(m.r,m.c))&&!this.grid.has(key(m.r,m.c)))this.queueMarker(m);
  this.ability={taskId:marker.id,kind:marker.kind,...cell(marker.r,marker.c,this.offset),removed:popped.length,fallen:fallen.length};this.last={id:++this.serial,popped,fallen,descent:false,specialKind:marker.kind};
 }
 resume(){if(this.phase!=='recovering')return false;this.math.close();this.activeMarker=null;if(this.queue.length)return this.beginNext();this.paused=false;this.accumulator=0;this.status=this.grid.size===0?'won':[...this.grid.values()].some(b=>cell(b.r,b.c,this.offset).y+R>=FAIL)?'lost':'playing';this.phase=this.status==='playing'?'play':this.status;return true;}
 configure(stageIndex,plan,slots,snapshot=null){this.stageIndex=stageIndex;this.math=new SlotMath(plan,slots);if(snapshot){for(const [k,v]of Object.entries(snapshot))if(!['grid','math','activeMarker'].includes(k))this[k]=structuredClone(v);this.grid=new Map(snapshot.grid.map(b=>[key(b.r,b.c),{...b}]));this.math.activeId=snapshot.math.activeId;this.activeMarker=this.markers.find(m=>m.id===this.math.activeId)||null;this.random=()=>{this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;};}else{this.grid.clear();const s=STAGES[stageIndex];for(let r=0;r<s.rows;r++)for(let c=0;c<(r%2?10:11);c++)if(stageIndex!==3||r<2||!(r%2===0&&c===0))this.put(r,c,(Math.floor(c/(stageIndex>=3?3:2))+Math.floor(r/2)+stageIndex)%s.colors);this.randomState=this.seed>>>0;this.random=()=>{this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;};this.current=this.pick();this.next=this.pick();this.markers=slotIds(stageIndex).map((id,i)=>({id,kind:s.kind==='mixed'?['merge','simplify'][i]:s.kind,r:s.rows-1,c:2+i*4,color:this.grid.get(key(s.rows-1,2+i*4))?.color??0,state:slots[id].outcome==='success'?'success':slots[id].outcome==='failed'?'failed':'waiting'}));this.start();}return this;}
 snapshot(){return {...super.snapshot(),current:this.current,next:this.next,stageIndex:this.stageIndex,serial:this.serial,accumulator:this.accumulator,randomState:this.randomState,phase:this.phase,markers:structuredClone(this.markers),queue:[...this.queue],ability:this.ability&&{...this.ability},math:this.math.snapshot()};}
}
