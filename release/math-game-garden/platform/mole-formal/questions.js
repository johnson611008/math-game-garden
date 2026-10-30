import {parse} from '../src/input/parser.js';
import {evaluateAst} from '../src/math/operations.js';
import {serialize,equivalent} from '../src/math/radical-value.js';
import {evaluateExpression} from '../src/assessment/evaluator.js';
import {formatValue} from '../src/math/format.js';
export const BANK_VERSION='mole-bank-2';
export const STAGES=['地鼠初登場','調皮地鼠','盔甲地鼠','魔法地鼠','地鼠王'];
export function rng(seed){let n=Number(seed)>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const value=s=>evaluateAst(parse(s));
export const judge=(q,o)=>evaluateExpression(q.expected,o.expression,'simplest-monomial');
const bank=[];
function make(stage,k,n,coefficient=1,powers=null){
 let d=n,c=1;for(let f=2;f*f<=d;f++)while(d%(f*f)===0){c*=f;d/=f*f;}c*=coefficient;
 const expr=(a,b)=>b===1?String(a):`${a===1?'':a}sqrt(${b})`;
 const correct=expr(c,d),wrong1=expr(c*c,d),wrong2=expr(c,d===2?3:2);
 const q={id:`mole15-v1-s${stage}-${k}`,stage,radicand:n,coefficient,powers,source:`${coefficient}*sqrt(${n})`,expected:serialize(value(`${coefficient}*sqrt(${n})`)),options:[correct,wrong1,wrong2].map((expression,i)=>({id:`s${stage}-${k}-o${i}`,expression,concept:['','平方因數提出時沒有開根號','拆出平方因數後算錯剩餘因數'][i]}))};
 if(q.options.filter(o=>judge(q,o).accepted).length!==1||q.options.some(o=>!judge(q,o).formSatisfied))throw Error('題庫驗證失敗');
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)if(equivalent(value(q.options[a].expression),value(q.options[b].expression)))throw Error('選項數學等值');
 bank.push(q);
}
[8,12,18,20,24,27,28,32,40,44].forEach((n,i)=>make(1,i,n));
[45,48,50,52,54,63,68,72,75,98].forEach((n,i)=>make(2,i,n));
[[2,8],[3,12],[2,18],[3,20],[2,24],[3,27],[2,28],[3,32],[2,40],[3,44]].forEach(([c,n],i)=>make(3,i,n,c));
[[[2,3]],[[2,5]],[[3,3]],[[3,5]],[[5,3]],[[5,5]],[[7,3]],[[7,5]],[[2,3],[3,2]],[[3,3],[2,2]]].forEach((f,i)=>make(4,i,f.reduce((n,[b,e])=>n*b**e,1),1,f));
[[2,45],[3,48],[2,50],[3,54],[2,63],[3,72],[2,75],[3,98]].forEach(([c,n],i)=>make(5,i,n,c));
make(5,8,2**5*3**2,2,[[2,5],[3,2]]);make(5,9,3**3*5**2,2,[[3,3],[5,2]]);
export const BANK=Object.freeze(bank);
export const DECIMAL_BANK=Object.freeze([2,3,5].flatMap(stage=>['0.2','0.3','0.5','0.8','1.2','1.8','2.7','3.2','4.5','4.8','7.2'].map((n,k)=>{const coefficient=stage===2?1:stage===3?2:3,source=`${coefficient}*sqrt(${n})`,correct=formatValue(value(source)),wrong1=formatValue(value(`${coefficient}*sqrt(${BigInt(n.replace('.','')).toString()})`)),wrong2=formatValue(value(`${coefficient+1}*sqrt(${n})`));const q={id:`mole15-v2-decimal-s${stage}-${k}`,stage,radicand:n,coefficient,powers:null,source,expected:serialize(value(source)),options:[correct,wrong1,wrong2].map((expression,i)=>({id:`decimal-s${stage}-${k}-o${i}`,expression,concept:['','忽略小數點，誤當成整數被開方數','根式化簡時外係數錯誤'][i]}))};if(q.options.filter(o=>judge(q,o).accepted).length!==1||q.options.some(o=>!judge(q,o).formSatisfied))throw Error('decimal-bank-invalid');for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)if(equivalent(value(q.options[a].expression),value(q.options[b].expression)))throw Error('decimal-options-equivalent');return Object.freeze(q);})));
export function buildQuestions(seed,version=BANK_VERSION){if(!['mole-bank-1',BANK_VERSION].includes(version))throw Error('unsupported-bank');const r=rng(seed),result=[];for(let stage=1;stage<=5;stage++){let chosen;if(version===BANK_VERSION&&[2,3,5].includes(stage)){const decimal=shuffle(DECIMAL_BANK.filter(q=>q.stage===stage),r)[0];chosen=shuffle([...shuffle(bank.filter(q=>q.stage===stage),r).slice(0,2),decimal],r);}else chosen=shuffle(bank.filter(q=>q.stage===stage&&!result.some(x=>x.source===q.source)),r).slice(0,3);for(const q of chosen)result.push({...structuredClone(q),options:shuffle(q.options,r)});}if(result.length!==15||new Set(result.map(q=>q.source)).size!==15)throw Error('題目配額或去重失敗');return result;}
export function validateQuestions(questions,seed,version=BANK_VERSION){if(JSON.stringify(questions)!==JSON.stringify(buildQuestions(seed,version)))throw Error('題目快照與版本不一致，保留資料並停止');}
export function display(s){return s.replaceAll('sqrt','√').replaceAll('*',' × ');}

