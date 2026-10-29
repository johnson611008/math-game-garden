import {SOURCES,readExisting,createAdmissionReader} from '../src/learning/cross-unit-admission.mjs';
import {decode,DB,PRODUCTION_KEY} from './store.mjs';
import {EXTRA,decodeLearning} from '../unit-five/learning.mjs';
import {QUALIFICATION_EXTRA,decodeQualifications} from '../unit-five/qualification.mjs';
import {grade} from './state.mjs';
const names=['根式打地鼠','根式彈珠工坊','根式泡泡派對','根式水晶礦車','拯救人質大作戰'];
const gems=['../crystal-cart-demo/assets/crystal_blue_candidate.png','../crystal-cart-demo/assets/crystal_purple_candidate.png','../crystal-cart-demo/assets/crystal_red_candidate.png','../crystal-cart-demo/assets/crystal_green_candidate.png','../rescue-battle-demo/assets/crystal.png'];
const topics=['化簡的勇氣','乘除的巧思','加減的魔法','四則的智慧','公式的力量'];
const fifth={unit:5,db:DB,key:PRODUCTION_KEY};
// Read-only presentation: no score, grant, event or persistent celebration flag.
export async function readGrandFinale({read=s=>readExisting(indexedDB,s),legacyValue=()=>localStorage.getItem(SOURCES[0].key)}={}){
 const snapshots=new Map();async function snapshot(s){if(!snapshots.has(s.unit))snapshots.set(s.unit,await read(s));return snapshots.get(s.unit);}
 const gate=await createAdmissionReader({readUnit:snapshot,legacyValue}).check(5);
 if(!gate.allowed)return {allowed:false,code:gate.code};
 const entry=await snapshot(fifth),record=entry.record;
 if(entry.keys.some(k=>k!==fifth.key)||record?.formatVersion!==1||record.legacyRaw!==null||typeof record.raw!=='string'||!record.extras)throw Error('finale-record-unconfirmed');
 const doc=decode(record.raw),learning=decodeLearning(record.extras[EXTRA]??null,doc);decodeQualifications(record.extras[QUALIFICATION_EXTRA]??null,doc,learning);
 const last=doc.rounds.at(-1);if(last?.phase!=='settled'||last.settlement?.status!=='passed'||grade(last).status!=='passed')return {allowed:false,code:'formal-five-not-passed'};
 const rows=[];for(const source of SOURCES){const model=await import(new URL(source.module,new URL('../src/learning/cross-unit-admission.mjs',import.meta.url))),d=model.decode((await snapshot(source)).record.raw),evidence=gate.evidence.find(x=>x.unit===source.unit),r=d.rounds.find(x=>(x.id||x.roundId)===evidence.roundId);const correct=source.unit===1?Object.values(r.records).filter(x=>x.first?.accepted).length:Object.values(r.slots).filter(x=>x.first?.correct).length;rows.push({unit:source.unit,name:names[source.unit-1],topic:topics[source.unit-1],correct,total:source.unit===1?15:10});}
 rows.push({unit:5,name:names[4],topic:topics[4],correct:grade(last).firstCorrect,total:10});
 return {allowed:true,code:'five-formal-passes-confirmed',roundId:last.roundId,rows,heroHP:last.battle.heroHP};
}
export function mountGrandFinale({reduced=()=>false}={}){
 const dialog=document.createElement('dialog');dialog.id='grand-finale';dialog.setAttribute('aria-labelledby','finale-title');
 dialog.innerHTML=`<div class="finale-world"><div class="finale-sky" aria-hidden="true"></div><div class="finale-stars" aria-hidden="true"></div><div class="finale-topline"><span>根式遊戲大觀園 · 終章</span><button type="button" class="finale-close">回看救援成果</button></div><header class="finale-heading"><p class="finale-overline">THE GRAND FINALE</p><h1 id="finale-title" tabindex="-1">五關全通關！</h1><p class="finale-tagline">根式傳奇，由你完成。</p><span class="finale-seal">五關正式通關 · 成果已確認</span></header><div class="finale-reunion" aria-label="勇者與獲救角色在花園團聚"><div class="finale-halo"></div><img class="finale-hero" src="../rescue-battle-demo/assets/characters/hero_mole.png" alt="一路奮戰的地鼠勇者"><div class="finale-crown" aria-hidden="true"><svg viewBox="0 0 120 95"><path d="M12 30L35 45 60 8 85 45 108 30 96 77H24Z" fill="#f8d478" stroke="#fff0b3" stroke-width="3"/><path d="M28 65H92M25 78H95" stroke="#ba7c35" stroke-width="5"/><path d="M60 38L70 53 60 68 50 53Z" fill="#7ee8de"/></svg></div><img class="finale-crystal" src="../rescue-battle-demo/assets/crystal.png" alt="五關力量匯聚的魔法水晶"><img class="finale-friend" src="../rescue-battle-demo/assets/characters/beautiful_mole.png" alt="平安獲救，與勇者團聚的朋友"><p>你點亮的不只是水晶，<br>還有每一次勇敢思考的自己。</p></div><ol class="finale-medals" aria-label="五關正式成果"></ol><section class="finale-gift"><button type="button" id="finale-open-gift" aria-expanded="false" aria-controls="finale-secret"><span aria-hidden="true">✧</span> 花園為你準備了一份驚喜 <span aria-hidden="true">✧</span></button><div id="finale-secret" hidden><span class="finale-honor">榮耀稱號</span><h2>根式傳奇探險家</h2><p>從第一道根式，到最後一道封印，<br>你把「我還不會」，一步步變成了「我做到了」。</p><strong>這一次，整座花園為你喝采。</strong><small>下一段冒險，就帶著這份勇氣出發吧。</small></div></section><footer class="finale-actions"><a href="../game-garden/">帶著榮耀，返回大觀園</a><button type="button" id="finale-replay">再看一次星光慶典</button><label><input type="checkbox" id="finale-reduced">降低動畫</label></footer></div>`;
 document.body.append(dialog);let opening=null,lastData=null,token=0,timer=null;
 const $=s=>dialog.querySelector(s),starBox=$('.finale-stars');for(let i=0;i<40;i++){const s=document.createElement('i');s.style.cssText=`--x:${(i*37)%100}%;--y:${(i*23)%90}%;--delay:${(i%8)*.19}s;--turn:${(i%2?1:-1)*110}deg;--hue:${[43,171,266,322][i%4]}`;starBox.append(s);}
 function motion(){dialog.classList.toggle('finale-reduced',$('#finale-reduced').checked||matchMedia('(prefers-reduced-motion:reduce)').matches)}
 function celebrate(){clearTimeout(timer);dialog.classList.remove('finale-celebrating');void dialog.offsetWidth;dialog.classList.add('finale-celebrating');timer=setTimeout(()=>dialog.classList.remove('finale-celebrating'),6000)}
 $('.finale-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.classList.remove('finale-celebrating')});
 $('#finale-reduced').onchange=motion;matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',motion);
 $('#finale-replay').onclick=()=>{motion();celebrate()};
 $('#finale-open-gift').onclick=()=>{const show=$('#finale-secret').hidden;$('#finale-secret').hidden=!show;$('#finale-open-gift').setAttribute('aria-expanded',String(show));if(show){celebrate();$('#finale-secret').scrollIntoView({block:'nearest',behavior:$('#finale-reduced').checked?'instant':'smooth'})}};
 document.addEventListener('visibilitychange',()=>dialog.classList.toggle('finale-away',document.hidden));
 return {async show(){if(dialog.open)return true;if(opening)return opening;const own=++token;opening=(async()=>{try{const data=await readGrandFinale();if(!data.allowed||own!==token)return false;lastData=data;$('.finale-medals').replaceChildren(...data.rows.map(row=>{const li=document.createElement('li');li.style.setProperty('--order',row.unit);li.innerHTML=`<span class="finale-number"><img src="${gems[row.unit-1]}" alt=""><i>0${row.unit}</i></span><strong>${row.topic}</strong><span>${row.name}</span><b>首次正確 ${row.correct}／${row.total}</b><small>正式通關</small>`;return li}));$('#finale-reduced').checked=reduced();motion();dialog.showModal();$('#finale-title').focus({preventScroll:true});celebrate();return true}catch{return false}finally{opening=null}})();return opening},inspect:()=>({open:dialog.open,roundId:lastData?.roundId,confirmed:!!lastData,rows:lastData?.rows.length||0}),close:()=>{token++;if(dialog.open)dialog.close()}};
}
