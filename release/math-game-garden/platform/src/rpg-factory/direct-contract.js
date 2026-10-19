import {generateQuestions} from '../questions/generator.js';
import {evaluate} from '../assessment/evaluator.js';
import {parse} from '../input/parser.js';
import {evaluateAst} from '../math/operations.js';
import {serialize} from '../math/radical-value.js';
import {fail} from '../math/errors.js';
import {largestSquareFactor} from '../math/integer-factorization.js';
import {formatValue} from '../math/format.js';

export const RPG_ANSWER_VERSION=2;
export function isDirectQuestion(q){return q?.challengeContractVersion===2&&q.interactionSpec?.schemaVersion===2&&q.interactionSpec.kind==='rpg-direct-answer';}
export function generateDirectQuestions(options){return generateQuestions({...options,mode:'challenge',count:14}).map(q=>{
  const next=structuredClone(q);next.challengeContractVersion=2;next.interactionSpec={schemaVersion:2,kind:'rpg-direct-answer'};
  if(next.station==='A'){
    next.taskType='simplify';next.answerSpec={expectedValue:serialize(evaluateAst(parse(next.source))),requiredForm:'simplest-monomial'};
    next.instruction='輸入最簡根式，啟動能源閘門。';
    // The original square-factor task's answer is a factor, not the radical.
    if(q.taskType==='largest-square-factor'){
      const n=BigInt(q.decompositionSpec.radicand),s=largestSquareFactor(n);
      next.solutionSteps=[`√${n} = √(${s} × ${n/s})。`,`將平方因數提出：√${s} × √${n/s}。`,`最簡答案：${formatValue(evaluateAst(parse(q.source)))}。`];
    }
  }else next.instruction=next.station==='B'?'判斷產品是否最簡；需要時直接輸入修正答案。':'輸入已完成有理化及約分的最簡答案，破解護盾。';
  return next;
});}
export function directResponse(q,response){
  if(!isDirectQuestion(q))fail('invalid-contract','不是 RPG 直接作答契約。');
  if(!response||typeof response!=='object'||Array.isArray(response))fail('invalid-contract','作答須為物件。');
  const fields=q.station==='B'?['isSimplest','correctedAnswer']:['answer'];
  return Object.fromEntries(fields.filter(k=>Object.hasOwn(response,k)).map(k=>[k,response[k]]));
}
export function evaluateDirectAnswer(q,response){
  if(!isDirectQuestion(q))fail('invalid-contract','不支援的 RPG 判分版本。');
  const result=evaluate(q,directResponse(q,response));
  return {...result,contractVersion:2,wholeCorrect:result.accepted,
    parts:q.station==='B'?{judgment:{accepted:result.judgmentCorrect},correction:result.correction}:{final:result}};
}
