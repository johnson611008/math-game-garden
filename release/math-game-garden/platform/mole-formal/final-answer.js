import{parse}from'../src/input/parser.js';import{evaluateAst}from'../src/math/operations.js';import{serialize}from'../src/math/radical-value.js';import{evaluateExpression}from'../src/assessment/evaluator.js';import{largestSquareFactor}from'../src/math/integer-factorization.js';import{seededRandom}from'../src/questions/seeded-random.js';
export const POLICY='wp16-simplify-final-v2';
export function finalQuestions(seed){const rng=seededRandom(seed),ns=rng.shuffle([8,12,18,20,24,27,28,32,40,44,45,48,50,52,54,56,63,68,72,75,76,80,84,90,92,98,99,108]);return ns.slice(0,10).map((n,i)=>{const source=`sqrt(${n})`;return{schemaVersion:1,id:`wp16-final-${i}-${n}`,unitId:'simplification',station:i<4?'A':i<7?'B':'C',taskType:'simplify',source,expressionAst:parse(source),instruction:'請將下列根式化為最簡根式。',responseSchema:'expression',answerSpec:{expectedValue:serialize(evaluateAst(parse(source))),requiredForm:'simplest-monomial'},conceptTags:['RADICAL_SIMPLIFICATION'],hintPlan:[1,2,3],solutionSteps:[],generatorVersion:POLICY};});}
// This is an input adapter for NEW submissions, never a migration of old results.
// Original question, first response, events and existing grades remain unchanged.
export function adaptFinal(q,input){const expected=q.taskType==='largest-square-factor'?serialize(evaluateAst(parse(q.source))):q.answerSpec.expectedValue;const checked=evaluateExpression(expected,input,'simplest-monomial');
 if(q.taskType==='largest-square-factor'){if(!checked.consumesFirst)return{answer:input};return{answer:checked.accepted?String(largestSquareFactor(BigInt(q.decompositionSpec.radicand))):'0'};}
 if(q.taskType==='judge-and-correct'){if(!checked.consumesFirst)return{isSimplest:false,correctedAnswer:input};return{isSimplest:checked.accepted?q.answerSpec.isSimplest:false,correctedAnswer:input};}
 return{answer:input};
}
export function finalView(state){const s=structuredClone(state);for(const q of s.attempt.questions){q.station='A';q.instruction='請將下列根式化為最簡根式。';q.taskType='simplify';delete q.interactionSpec;delete q.decompositionSpec;delete q.stepSpec;}return s;}
