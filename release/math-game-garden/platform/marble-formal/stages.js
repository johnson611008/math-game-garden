import {questions,questionDeck} from '../marble-demo/b/questions.js';
export const VERSION='marble-five-v1';
export const stages=[
 {id:'S1',name:'彈珠初登場',topic:'基礎根式乘法',accent:'#ffd76d',speed:350,width:168,rows:['ssssss','ssEEss'],hint:'寬木板、慢球速。先瞄準兩顆能源核心。'},
 {id:'S2',name:'冰晶工坊',topic:'基礎根式除法',accent:'#8de4ff',speed:390,width:152,rows:['iiisiii','siiEiis','siEsiss'],hint:'冰晶碰兩次才碎，裂紋會保留。'},
 {id:'S3',name:'連鎖實驗室',topic:'含係數根式乘除',accent:'#ffc074',speed:420,width:144,rows:['sccc cs','sEsEs s','sssss s'],hint:'充能後再撞一次，讓能量沿磚塊傳遞。'},
 {id:'S4',name:'機械迷宮',topic:'混合乘除',accent:'#c5b4ff',speed:430,width:144,rows:['sssiiss','sE s Es','s X X s',' ss ss '],hint:'借木箱改變方向，從空隙突破。'},
 {id:'S5',name:'星光核心',topic:'綜合根式乘除',accent:'#ffe4ad',speed:450,width:140,rows:['sicicis','sE s Es',' iX Xi ',' ssiss '],hint:'修復最後兩顆星核，清場後確認整趟挑戰。'}
];
export const SLOT_IDS=stages.flatMap(s=>[s.id+'-Q1',s.id+'-Q2']);
export function stageLayout(index){const stage=stages[index];if(!stage)throw Error('unknown-stage');let n=0,core=0;const blocks=[];for(let row=0;row<stage.rows.length;row++){const line=stage.rows[row];for(let col=0;col<line.length;col++){const ch=line[col];if(ch===' ')continue;const type={s:'stone',i:'ice',c:'chain',X:'crate',E:'chain'}[ch];if(!type)throw Error('layout-type');const energy=ch==='E'?stage.id+'-Q'+(++core):null;blocks.push({id:stage.id+'-brick-'+n++,x:32+col*83,y:115+row*77,w:76,h:48,type,hp:type==='crate'?null:type==='ice'?2:1,alive:true,queued:false,group:ch==='c'?'amber':null,flash:0,...(energy?{energy,charge:'empty'}:{})});}}
 if(core!==2)throw Error('stage-needs-two-cores');return blocks;}
export function makePlan(seed){const deck=questionDeck(seed),used=new Set(),plan={};const take=(test,n)=>{const a=deck.filter(q=>!used.has(q.id)&&test(q)).slice(0,n);if(a.length!==n)throw Error('stage-question-capacity');a.forEach(q=>used.add(q.id));return a;};
 for(let i=0;i<5;i++){let qs;if(i===0)qs=take(q=>q.kind==='root-multiplication',6);else if(i===1)qs=take(q=>q.kind==='root-division',6);else if(i===2)qs=[...take(q=>q.kind==='coefficient-multiplication',3),...take(q=>q.kind==='coefficient-division',3)];else qs=[...take(q=>q.kind.endsWith('multiplication'),3),...take(q=>q.kind.endsWith('division'),3)];plan[`S${i+1}-Q1`]=qs.slice(0,3);plan[`S${i+1}-Q2`]=qs.slice(3);}
 return plan;
}
export function distribution(){return Object.fromEntries([...new Set(questions.map(q=>q.kind))].map(k=>[k,questions.filter(q=>q.kind===k).length]));}
