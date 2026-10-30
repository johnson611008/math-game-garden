import{parse}from'../../input/parser.js';
import{evaluateAst}from'../../math/operations.js';
import{serialize}from'../../math/radical-value.js';
import{formatValue}from'../../math/format.js';
import{seededRandom}from'../seeded-random.js';
export function withDecimalPractice(questions,seed){const values=seededRandom('decimal-v1:'+seed).shuffle(['0.2','0.3','0.5','0.8','1.2','1.8','2.7','3.2','4.5','4.8','7.2']);let index=0;return questions.map(q=>{if(q.station!=='A'||index>=2)return q;const n=values[index++],source=`sqrt(${n})`,expressionAst=parse(source),expected=evaluateAst(expressionAst),copy={...structuredClone(q),id:q.id+':decimal-v1',source,expressionAst,taskType:'simplify',templateId:'one-decimal-radicand-v1',instruction:'請將下列根式化為最簡根式。',responseSchema:'expression',answerSpec:{expectedValue:serialize(expected),requiredForm:'simplest-monomial'},conceptTags:['decimal-radicand','rationalization'],solutionSteps:['先將一位小數寫成分母為10的分數，再化簡根式與有理化。',`本題最簡答案：${formatValue(expected)}。`]};for(const k of['presentation','decompositionSpec','interactionSpec','stepSpec'])delete copy[k];return copy;});}
