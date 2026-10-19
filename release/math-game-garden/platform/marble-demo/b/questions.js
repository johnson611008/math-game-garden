import {parse} from '../../src/input/parser.js';
import {evaluateAst} from '../../src/math/operations.js';
import {equivalent} from '../../src/math/radical-value.js';
import {inspectSimplest} from '../../src/math/form-checker.js';
import {formatValue} from '../../src/math/format.js';
export const QUESTION_VERSION='WP08-B-R2-1';
const value=s=>evaluateAst(parse(s)),display=s=>s.replace(/sqrt\((\d+)\)/g,'√$1').replaceAll('*',' × '),format=s=>formatValue(value(s));
function make(id,a,b,c,d,division=false){
 const left=`${c===1?'':c}sqrt(${a})`,right=`${d===1?'':d}sqrt(${b})`,expression=division?`${left}/(${right})`:`${left}*${right}`;
 const key=division?expression:[left,right].sort().join('*');
 const candidates=division?[
  [`${c}sqrt(${a-b})`,'SUBTRACT_RADICANDS'],[`${c}sqrt(${a})`,'IGNORE_DIVISOR'],[`(${c}*${a})/(${d}*${b})`,'ROOT_NOT_EVALUATED']
 ]:[
  [`${c+d}sqrt(${a+b})`,'ADD_INSTEAD_OF_MULTIPLY'],[`${c*d}sqrt(${a+b})`,'ADD_RADICANDS'],[`${c*d*a*b}`,'FORGET_ROOT'],[`${c*d}sqrt(${a})`,'IGNORE_FACTOR']
 ];
 const options=[{text:display(format(expression)),concept:'CORRECT'}],vs=[value(expression)];
 for(const [s,concept]of candidates){const v=value(s);if(vs.some(other=>equivalent(v,other)))continue;vs.push(v);options.push({text:display(format(s)),concept});if(options.length===3)break;}
 if(options.length!==3)throw Error('無法建立有效誘答');
 return {id,key,version:QUESTION_VERSION,kind:division?(c===1&&d===1?'root-division':'coefficient-division'):(c===1&&d===1?'root-multiplication':'coefficient-multiplication'),expression,text:division?`${display(left)} ÷ (${display(right)})`:`${display(left)} × ${display(right)}`,options:options.map(o=>o.text),misconceptions:options.map(o=>o.concept)};
}
function bank(){const all=[],seen=new Set();function add(a,b,c=1,d=1,div=false){const q=make('q'+(all.length+1),a,b,c,d,div);if(!seen.has(q.key)){all.push(q);seen.add(q.key);}}
 add(3,12);add(5,2,2,3);add(48,3,1,1,true);add(15,3,6,3,true);add(8,18);
 for(const a of [2,3,5,6,7])for(const b of [8,12,18,20]){add(a,b);add(a,b,2,3);}
 for(const b of [2,3,5,6])for(const k of [2,3,4]){add(b*k*k,b,1,1,true);add(b*k*k,b,6,3,true);}
 return all;
}
export const questions=bank();
export function correct(q,index){return Number.isInteger(index)&&index>=0&&index<3&&equivalent(value(q.options[index]),value(q.expression))&&inspectSimplest(parse(q.options[index])).satisfied;}
export function validateQuestions(list=questions){if(list.length<30)throw Error('題庫不足：十次充能最壞需三十題，已停止開始');const keys=new Set(),ids=new Set();for(const q of list){if(keys.has(q.key)||ids.has(q.id))throw Error('重複題目');keys.add(q.key);ids.add(q.id);if(q.options.length!==3||q.misconceptions.length!==3)throw Error('選項契約錯誤');if(q.options.filter((_,i)=>correct(q,i)).length!==1)throw Error('正確選項不唯一');const vs=q.options.map(value);for(let i=0;i<3;i++)for(let j=0;j<i;j++)if(equivalent(vs[i],vs[j]))throw Error('等值選項');}return true;}
export function random(seed){let state=seed>>>0;return()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function questionDeck(seed,list=questions){validateQuestions(list);const rng=random(seed);return shuffle(list,rng).map(q=>{const order=shuffle([0,1,2],rng);return {...q,options:order.map(i=>q.options[i]),misconceptions:order.map(i=>q.misconceptions[i])};});}
