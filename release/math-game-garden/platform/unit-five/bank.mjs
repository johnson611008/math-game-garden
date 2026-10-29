import {parse} from '../src/input/parser.js';
import {evaluateAst} from '../src/math/operations.js';
import {formatValue} from '../src/math/format.js';
import {equivalent,times,serialize} from '../src/math/radical-value.js';
import {inspectFinalSum,judge} from '../alchemy-direct/model.mjs';
import {QUESTIONS as FORMAL,pretty} from '../rescue-battle-demo/questions.mjs';
import {rng} from '../bubble-demo/engine.js';
export const BANK_VERSION='unit-five-formulas-remediation-v1';
export const GROUPS=Object.freeze(['distribution','sum-square','difference-square','square-difference','rationalize']);
export const LABELS=Object.freeze({distribution:'分配律與根式化簡','sum-square':'和的平方公式','difference-square':'差的平方公式','square-difference':'平方差公式',rationalize:'共軛有理化'});
const value=s=>evaluateAst(parse(s));
const candidates=[];
function add(q){if(FORMAL.some(f=>f.expression===q.expression))return;let computed;
 if(q.denominator)computed=value(`((${q.numerator})*(${q.conjugate}))/((${q.denominator})*(${q.conjugate}))`);else computed=value(q.expression);
 candidates.push({...q,concept:LABELS[q.group],answer:formatValue(computed),text:q.text||pretty(q.expression)});
}
for(const r of [2,3,5,6,7])for(let a=1;a<=4;a++){
 const coefficient=a===1?'':a;
 add({id:`u5-dist-${r}-${a}`,group:'distribution',expression:`sqrt(${r})*(${coefficient}sqrt(${r})+sqrt(${2*r}))`});
 add({id:`u5-sum-${r}-${a}`,group:'sum-square',expression:`(${a}+sqrt(${r}))*(${a}+sqrt(${r}))`,text:`（${a}＋√${r}）²`});
 add({id:`u5-diff-${r}-${a}`,group:'difference-square',expression:`(sqrt(${r})-${a})*(sqrt(${r})-${a})`,text:`（√${r}−${a}）²`});
 add({id:`u5-pair-${r}-${a}`,group:'square-difference',expression:`(${coefficient}sqrt(${r})+sqrt(2))*(${coefficient}sqrt(${r})-sqrt(2))`});
 add({id:`u5-rational-plus-${r}-${a}`,group:'rationalize',numerator:String(a),denominator:`sqrt(${r})+1`,conjugate:`sqrt(${r})-1`,expression:`(${a})/(sqrt(${r})+1)`});
}
for(const [r,s] of [[5,2],[7,3],[6,2],[5,3],[3,2]])for(let a=1;a<=4;a++)add({id:`u5-rational-minus-${r}-${s}-${a}`,group:'rationalize',numerator:String(a),denominator:`sqrt(${r})-sqrt(${s})`,conjugate:`sqrt(${r})+sqrt(${s})`,expression:`(${a})/(sqrt(${r})-sqrt(${s}))`});
export const BANK=Object.freeze(candidates.map(q=>Object.freeze(q)));
export function validateBank(){const ids=new Set(),expressions=new Set();return BANK.map(q=>{
 if(ids.has(q.id)||expressions.has(q.expression)||FORMAL.some(f=>f.expression===q.expression))throw Error('duplicate-remediation-question');ids.add(q.id);expressions.add(q.expression);
 const answer=value(q.answer);if(!inspectFinalSum(parse(q.answer)).satisfied||formatValue(answer)!==q.answer||!judge(q,q.answer).accepted)throw Error('invalid-simplest-answer:'+q.id);
 let computed,proof=null;
 if(q.denominator){const den=value(q.denominator),num=value(q.numerator),rational=times(den,value(q.conjugate));if(rational.size!==1||!rational.has(1n)||!rational.get(1n).n)throw Error('invalid-conjugate');computed=value(`((${q.numerator})*(${q.conjugate}))/((${q.denominator})*(${q.conjugate}))`);if(!equivalent(times(answer,den),num))throw Error('cross-product-failed');proof={method:'existing-bank-specific-conjugate-and-cross-product',denominator:serialize(rational),crossProduct:true};}
 else computed=value(q.expression);
 if(!equivalent(answer,computed))throw Error('exact-mismatch');
 return {...q,exact:serialize(answer),proof,verified:true};
 });}
export const judgeAnswer=(q,input)=>judge(q,input);
export const hintText=q=>({distribution:'括號內每一項都要乘上外面的因數；提出根式的平方因數後再合併同類項。','sum-square':'和的平方有三項，檢查中間是否包含兩倍乘積；兩端也要分別平方。','difference-square':'差的平方的中間項為負的兩倍乘積，最後一項是正數；留意減號。','square-difference':'和與差互為共軛時，中間項會抵銷；留下兩端的平方之差，係數也要平方。',rationalize:'分子分母同乘分母的共軛式；用平方差檢查新分母，再完整分配分子並約分。'})[q.group];
export function errorGroups(source){return source.battle.records.flatMap((record,i)=>record.first&&!record.first.accepted?[['distribution','distribution','sum-square','difference-square','sum-square','square-difference','square-difference','rationalize','rationalize','rationalize'][i]]:[]);}
export function plan(seed,source,previous=[]){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('invalid-remediation-seed');
 const errors=errorGroups(source),counts=new Map(GROUPS.map(g=>[g,1]));
 const priority=[...new Set(errors)].sort((a,b)=>errors.filter(x=>x===b).length-errors.filter(x=>x===a).length||GROUPS.indexOf(a)-GROUPS.indexOf(b));
 const extra=priority.length?priority:GROUPS;
 for(let n=0;n<5;n++){let eligible=extra.filter(g=>counts.get(g)<4);if(!eligible.length)eligible=GROUPS.filter(g=>counts.get(g)<4);const g=eligible[n%eligible.length];counts.set(g,counts.get(g)+1);}
 const last=new Set(previous.at(-1)?.questions.map(q=>q.id)||[]),used=new Set(previous.flatMap(a=>a.questions.map(q=>q.id))),random=rng(seed),chosen=[];
 for(const group of GROUPS){const pool=BANK.filter(q=>q.group===group&&!last.has(q.id)).map(q=>({q,seen:used.has(q.id)?1:0,tie:random()})).sort((a,b)=>a.seen-b.seen||a.tie-b.tie);if(pool.length<counts.get(group))throw Error('insufficient-remediation-bank');chosen.push(...pool.slice(0,counts.get(group)).map(x=>x.q));}
 const ordered=chosen.map(q=>({q,tie:random()})).sort((a,b)=>a.tie-b.tie).map(x=>structuredClone(x.q));
 if(ordered.length!==10||new Set(ordered.map(q=>q.id)).size!==10)throw Error('invalid-remediation-plan');return ordered;
}
validateBank();
