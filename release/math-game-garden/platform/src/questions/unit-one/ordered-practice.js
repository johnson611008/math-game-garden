import{generateQuestions}from'../generator.js';
import{seededRandom}from'../seeded-random.js';
import{parse}from'../../input/parser.js';
import{evaluateAst}from'../../math/operations.js';
import{serialize}from'../../math/radical-value.js';
import{formatValue}from'../../math/format.js';
export const GROUPS=[
 {label:'根號內有平方因數',sources:['sqrt(12)','sqrt(20)','sqrt(24)','sqrt(28)','sqrt(45)','sqrt(50)'],hints:['找出根號內的完全平方因數，例如4、9或25。','將平方因數開根號提出，剩下的數留在根號內。']},
 {label:'根號外有係數',sources:['3sqrt(18)','2sqrt(8)','2sqrt(12)','3sqrt(20)','2sqrt(27)','2sqrt(32)'],hints:['先化簡根號內的數，原本根號外的係數要保留。','把提出根號的係數，乘上原本根號外的係數。']},
 {label:'分母有根號',sources:['5/sqrt(3)','2/sqrt(3)','3/sqrt(2)','4/sqrt(5)','6/sqrt(3)','2/sqrt(5)'],hints:['分母還有根號，試著讓分子分母同乘相同的根式。','分母有理化後，再檢查分子與分母能否約分。']},
 {label:'根號內有分數',sources:['sqrt(3/5)','sqrt(2/3)','sqrt(3/2)','sqrt(5/3)','sqrt(2/5)','sqrt(5/2)'],hints:['可把分數的平方根寫成分子、分母的平方根相除。','先化簡根式，再將分母有理化，最後約分。']},
 {label:'根號內有一位小數',sources:['sqrt(0.6)','sqrt(0.2)','sqrt(0.3)','sqrt(0.5)','sqrt(0.8)','sqrt(1.8)'],hints:['先將一位小數改寫成分母為10的分數。','依照分數根式的方法化簡，再有理化分母並約分。']},
];
export function orderedPractice(seed){const base=generateQuestions({unitId:'simplification',mode:'practice',count:10,seed}),random=seededRandom('ordered-v1:'+seed);return GROUPS.flatMap((g,group)=>random.shuffle(g.sources).slice(0,2).map((source,k)=>{const i=group*2+k,ast=parse(source),expected=evaluateAst(ast);const q={...base[i],id:`u1:ordered-v1:${seed}:${i}`,taskType:'simplify',templateId:'ordered-foundation-v1',source,expressionAst:ast,responseSchema:'expression',instruction:'請將下列根式化為最簡根式。',answerSpec:{expectedValue:serialize(expected),requiredForm:'simplest-monomial'},practiceLabel:g.label,practiceHints:g.hints,conceptTags:[group===4?'decimal-radicand':group>=2?'rationalization':'square-factor'],solutionSteps:[...g.hints,`本題最簡答案：${formatValue(expected)}。`]};for(const key of['presentation','decompositionSpec','interactionSpec','stepSpec'])delete q[key];return q;}));}
