import {parse} from '../src/input/parser.js';
import {evaluateAst} from '../src/math/operations.js';
import {equivalent,serialize,times} from '../src/math/radical-value.js';
import {formatValue} from '../src/math/format.js';
import {judge as judgeFinal,inspectFinalSum} from '../alchemy-direct/model.mjs';

export const value=text=>evaluateAst(parse(text));
export const pretty=text=>text.replace(/sqrt\((\d+)\)/g,'√$1').replaceAll('*','×').replaceAll('/','÷').replaceAll('+','＋').replaceAll('-','−');
const entries=[
 ['Q1','分配律','√2（√8＋√18）','sqrt(2)*(sqrt(8)+sqrt(18))','10','把括號內每一項都乘上外面的根式，再化簡。'],
 ['Q2','分配律與化簡','√3（2√3＋√6）','sqrt(3)*(2sqrt(3)+sqrt(6))','6+3sqrt(2)','每一項都要乘；先化簡根式，再分開整理整數與根式。'],
 ['Q3','和的平方','（√3＋√5）²','(sqrt(3)+sqrt(5))*(sqrt(3)+sqrt(5))','8+2sqrt(15)','和的平方有三項：兩端的平方，以及中間的兩倍乘積。'],
 ['Q4','差的平方','（√7−√2）²','(sqrt(7)-sqrt(2))*(sqrt(7)-sqrt(2))','9-2sqrt(14)','差的平方仍有三項；中間項是負的兩倍乘積，最後一項是正的。'],
 ['Q5','完全平方與係數','（2＋√3）²','(2+sqrt(3))*(2+sqrt(3))','7+4sqrt(3)','先把兩端平方，再檢查中間項是否包含兩倍乘積。'],
 ['Q6','平方差','（√5＋√2）（√5−√2）','(sqrt(5)+sqrt(2))*(sqrt(5)-sqrt(2))','3','共軛的和與差相乘，中間項互相抵銷；留下兩項平方的差。'],
 ['Q7','含係數平方差','（2√3＋√5）（2√3−√5）','(2sqrt(3)+sqrt(5))*(2sqrt(3)-sqrt(5))','7','套平方差時，係數也要平方，別只平方根號。'],
];
const rational=[
 ['Q8','共軛有理化','1','sqrt(2)+1','sqrt(2)-1','-1+sqrt(2)','分子分母同乘分母的共軛式；先用平方差檢查新分母。'],
 ['Q9','有理化與約分','2','sqrt(5)-sqrt(3)','sqrt(5)+sqrt(3)','sqrt(3)+sqrt(5)','同乘共軛後，新分母是兩個平方的差，最後要約分。'],
 ['Q10','有理化綜合','sqrt(6)+sqrt(2)','sqrt(3)-1','sqrt(3)+1','2sqrt(2)+sqrt(6)','分子與共軛式要完整分配相乘，化簡後合併同類項，再處理分母。'],
];
export const QUESTIONS=Object.freeze([
 ...entries.map(([id,concept,text,expression,answer,hint])=>Object.freeze({id,concept,text,expression,answer,hint})),
 ...rational.map(([id,concept,numerator,denominator,conjugate,answer,hint])=>Object.freeze({id,concept,text:`(${pretty(numerator)}) ÷ (${pretty(denominator)})`,numerator,denominator,conjugate,answer,hint,expression:`(${numerator})/(${denominator})`})),
]);
// No new arithmetic engine: only bank-specific conjugate proofs, executed by the unchanged exact engine.
export function validateBank(){
 if(QUESTIONS.length!==10||new Set(QUESTIONS.map(q=>q.id)).size!==10)throw Error('invalid-bank');
 return QUESTIONS.map(q=>{
  const expected=value(q.answer);
  if(!inspectFinalSum(parse(q.answer)).satisfied||formatValue(expected)!==q.answer)throw Error('answer-not-canonical:'+q.id);
  let computed,proof=null;
  if(q.denominator){
   const denominator=value(q.denominator),conjugate=value(q.conjugate),numerator=value(q.numerator);
   const rationalDenominator=times(denominator,conjugate);
   if(rationalDenominator.size!==1||!rationalDenominator.has(1n)||!rationalDenominator.get(1n).n)throw Error('conjugate-not-safe:'+q.id);
   const expression=`((${q.numerator})*(${q.conjugate}))/((${q.denominator})*(${q.conjugate}))`;
   computed=value(expression);
   if(!equivalent(times(expected,denominator),numerator))throw Error('cross-product-proof-failed:'+q.id);
   let unsupported=false;try{value(q.expression);}catch(e){if(e.code!=='unsupported-expression')throw e;unsupported=true;}
   proof={directBinomialDivisionUnsupported:unsupported,rationalizedExpression:expression,rationalDenominator:serialize(rationalDenominator),crossProductMatchesNumerator:true};
  }else computed=value(q.expression);
  if(!equivalent(expected,computed)||!judgeFinal(q,q.answer).accepted)throw Error('exact-bank-mismatch:'+q.id);
  return {...q,answerDisplay:pretty(q.answer),exact:serialize(expected),proof,verified:true};
 });
}
export const judge=(question,input)=>judgeFinal(question,input);
validateBank(); // Fail closed if the ten verified problems cannot load.
