import {parse} from '../src/input/parser.js';
import {evaluateAst} from '../src/math/operations.js';
import {serialize,equivalent} from '../src/math/radical-value.js';
import {evaluateExpression} from '../src/assessment/evaluator.js';
import {inspectSimplest} from '../src/math/form-checker.js';
import {rng} from '../bubble-demo/engine.js';
export const VERSION='bubble-five-add-subtract-v1';
export const value=s=>evaluateAst(parse(s));
export const display=s=>s.replace(/sqrt\((\d+)\)/g,'√$1').replaceAll('+','＋').replaceAll('-','−').replaceAll('*','×');
const bank=[];
for(let stage=1;stage<=5;stage++)for(let i=0;i<12;i++){
 const d=[2,3,5,7][i%4],a=1+Math.floor(i/4),b=2+i%3;
 let expression,answer,concept;
 if(stage===1){expression=`${a}sqrt(${d})+${b}sqrt(${d})`;answer=`${a+b}sqrt(${d})`;concept='COMBINE_LIKE_RADICALS';}
 if(stage===2){expression=i%3===0?`${a}sqrt(${d})-${a}sqrt(${d})`:`${a+b}sqrt(${d})-${b}sqrt(${d})`;answer=i%3===0?'0':`${a}sqrt(${d})`;concept='SUBTRACT_COEFFICIENTS';}
 if(stage===3){expression=`${a}sqrt(${4*d})+sqrt(${9*d})`;answer=`${2*a+3}sqrt(${d})`;concept='SIMPLIFY_BEFORE_COMBINING';}
 if(stage===4){const e=[3,5,7,2][i%4];expression=`${a+b}sqrt(${d})+${b}sqrt(${d})-${a}sqrt(${d})${i%2?`+sqrt(${e})`:''}`;answer=`${2*b}sqrt(${d})${i%2?`+sqrt(${e})`:''}`;concept='SIGNS_AND_LIKE_TERMS';}
 if(stage===5){const e=[3,5,7,2][i%4];expression=`${a}sqrt(${4*d})+sqrt(${9*d})-${b}sqrt(${d})${i%2?`+sqrt(${e})`:''}`;answer=`${2*a+3-b}sqrt(${d})${i%2?`+sqrt(${e})`:''}`;concept='SIMPLIFY_AND_SIGNS';}
 answer=answer.replace(/^1sqrt/,'sqrt');
 bank.push({id:`S${stage}-bank-${i}`,version:VERSION,stage,kind:`add-subtract-${stage}`,expression,answer,text:display(expression),expected:serialize(value(expression)),concept,level:stage});
}
export const BANK=bank;
// Unit-three form adapter: the existing form checker intentionally accepts only
// monomials. Reuse it per term; the exact value engine remains unchanged.
export function judge(q,answer){const result=evaluateExpression(q.expected,answer);if(!result.consumesFirst||!result.equivalent)return result;const ast=parse(answer),terms=[];function split(n){if(n.type==='binary'&&['+','-'].includes(n.operator)){split(n.left);split(n.right);}else terms.push(n);}split(ast);if(terms.length===1)return result;const bases=new Set();let simplest=true;for(const t of terms){const v=serialize(evaluateAst(t));if(!inspectSimplest(t).satisfied||v.terms.length!==1){simplest=false;break;}const basis=v.terms[0].radicand;if(bases.has(basis)){simplest=false;break;}bases.add(basis);}return {...result,accepted:simplest,formSatisfied:simplest,status:simplest?'correct':'equivalent-not-simplest',reasonCodes:simplest?[]:['UNCOMBINED_OR_UNSIMPLIFIED_TERMS']};}
export function validateBank(){const ids=new Set(),expressions=new Set();for(const q of BANK){if(ids.has(q.id)||expressions.has(q.expression))throw Error('duplicate-question');ids.add(q.id);expressions.add(q.expression);if(!equivalent(value(q.expression),value(q.answer))||!judge(q,q.answer).accepted)throw Error('invalid-bank-answer');}for(let s=1;s<=5;s++)if(BANK.filter(q=>q.stage===s).length<10)throw Error('bank-capacity');return {questions:BANK.length,perStage:12};}
export function shuffled(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makePlan(seed){const random=rng(seed),plan={};for(let s=1;s<=5;s++){const pool=shuffled(BANK.filter(q=>q.stage===s),random);for(let n=1;n<=2;n++)plan[`S${s}-Q${n}`]=pool.slice((n-1)*3,n*3).map(q=>structuredClone(q));}return plan;}
validateBank();
function freeze(value){if(value&&typeof value==='object'){for(const x of Object.values(value))freeze(x);Object.freeze(value);}}freeze(BANK);
