// D2-A question data only. No round, storage, eligibility or game authority here.
import{parse}from'../src/input/parser.js';
import{evaluateAst}from'../src/math/operations.js';
import{equivalent,serialize}from'../src/math/radical-value.js';
import{formatValue}from'../src/math/format.js';
import{judge,inspectFinalSum}from'../alchemy-direct/model.mjs';
import{rng}from'../bubble-demo/engine.js';
export const BANK_VERSION='unit-four-cart-mixed-10-v1';
const value=s=>evaluateAst(parse(s));
export const notation=s=>s.replace(/sqrt\((\d+)\)/g,'√$1');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const q=(n,title,expression,answer,concepts,wrong)=>({id:`u4-cart-q${String(n).padStart(2,'0')}`,title,expression,text:notation(expression).replaceAll('*',' × ').replaceAll('/',' ÷ ').replaceAll('+',' ＋ ').replaceAll('-',' − '),answer,concepts,distractors:wrong.map(([answer,concept,explanation,misstep],i)=>({id:`u4-cart-q${String(n).padStart(2,'0')}-d${i+1}`,answer,concept,explanation,misstep}))});
export const BANK=freeze([
 q(1,'晶核點火','sqrt(3)*sqrt(3)+2','5',['MULTIPLY_BEFORE_ADD'],[
  ['6','ADD_AS_MULTIPLY','把最後的加2誤作乘2','sqrt(3)*sqrt(3)*2'],
  ['3','OMIT_CONSTANT','漏加最後的2','sqrt(3)*sqrt(3)'],
  ['2+sqrt(6)','MULTIPLY_ROOTS_AS_ADD_RADICANDS','根式相乘時錯把根號內數字相加','sqrt(3+3)+2'],
  ['2+2sqrt(3)','MULTIPLY_AS_ADD_LIKE_TERMS','把根式乘法當成同類項加法','sqrt(3)+sqrt(3)+2'],
  ['11','IGNORE_RADICAL','忽略兩個根號，直接算3乘3','3*3+2']
 ]),
 q(2,'雙色晶光','2sqrt(2)+sqrt(2)*sqrt(2)','2+2sqrt(2)',['MULTIPLY_BEFORE_ADD','UNLIKE_TERMS'],[
  ['4sqrt(2)','COMBINE_UNLIKE_TERMS','把整數2也當作2√2合併','(2+2)*sqrt(2)'],
  ['6','LEFT_TO_RIGHT','忽略先乘後加，直接由左至右計算','(2sqrt(2)+sqrt(2))*sqrt(2)'],
  ['4','DROP_ROOT_IN_ADDEND','把加項2√2錯看成整數2','2+sqrt(2)*sqrt(2)'],
  ['2sqrt(2)','OMIT_PRODUCT','漏掉兩個根式的乘積','2sqrt(2)'],
  ['4+2sqrt(2)','IGNORE_RADICAL_IN_PRODUCT','乘法中的根號被忽略，誤算成2乘2','2sqrt(2)+2*2']
 ]),
 q(3,'森林微光','sqrt(12)+sqrt(3)*2','4sqrt(3)',['SIMPLIFY_ROOT','MULTIPLY_BEFORE_ADD'],[
  ['6sqrt(3)','LEFT_TO_RIGHT','先把兩個根式相加，再把全部乘2','(sqrt(12)+sqrt(3))*2'],
  ['3sqrt(3)','DROP_EXTRACTED_FACTOR','化簡√12時漏掉提出來的係數2','sqrt(3)+sqrt(3)*2'],
  ['2sqrt(3)','OMIT_ADDEND','漏掉第一個加項√12','sqrt(3)*2'],
  ['3sqrt(2)','MOVE_OPERATIONS_UNDER_ROOT','錯把加法及乘2一起移入根號','sqrt(12+3*2)'],
  ['2sqrt(6)','ADD_RADICANDS_WHEN_COMBINING','兩個2√3相加時錯把根數相加','2sqrt(3+3)']
 ]),
 q(4,'月光聚能','(sqrt(3)+2sqrt(3))*sqrt(3)','9',['PARENTHESES','DISTRIBUTION'],[
  ['3sqrt(3)','OMIT_OUTER_FACTOR','算完括號後漏乘外面的√3','sqrt(3)+2sqrt(3)'],
  ['3+2sqrt(3)','INCOMPLETE_DISTRIBUTION','外面的√3只乘到第一項','sqrt(3)*sqrt(3)+2sqrt(3)'],
  ['6+sqrt(3)','IGNORE_PARENTHESES','忽略括號，只把第二項乘外面的√3','sqrt(3)+2sqrt(3)*sqrt(3)'],
  ['9sqrt(3)','KEEP_ROOT_AFTER_PRODUCT','√3乘√3之後錯誤保留根號','3*3sqrt(3)'],
  ['3sqrt(6)','MULTIPLY_ROOTS_AS_ADD_RADICANDS','括號合併後，相乘時把3與3相加','3sqrt(3+3)']
 ]),
 q(5,'森林之心','sqrt(18)+sqrt(2)*sqrt(8)-2','2+3sqrt(2)',['SIMPLIFY_ROOT','ORDER_AND_SIGN'],[
  ['4+3sqrt(2)','OMIT_SUBTRACTION','漏掉最後減2','sqrt(18)+sqrt(2)*sqrt(8)'],
  ['6+3sqrt(2)','SUBTRACT_AS_ADD','把減2誤作加2','sqrt(18)+sqrt(2)*sqrt(8)+2'],
  ['-2+3sqrt(2)','OMIT_PRODUCT','漏掉中間的根式乘積','sqrt(18)-2'],
  ['2+sqrt(2)','DROP_EXTRACTED_FACTOR','把√18化簡時漏掉係數3','sqrt(2)+sqrt(2)*sqrt(8)-2'],
  ['5sqrt(2)','COMBINE_UNLIKE_TERMS','把整理後的整數2與3√2直接合併係數','(2+3)*sqrt(2)']
 ]),
 q(6,'銀光分母','1/sqrt(2)+sqrt(8)','5sqrt(2)/2',['RATIONALIZE_DENOMINATOR','SIMPLIFY_ROOT','COMMON_DENOMINATOR'],[
  ['3sqrt(2)','DROP_RATIONALIZED_DENOMINATOR','把1/√2誤寫成√2，漏掉分母2','sqrt(2)+sqrt(8)'],
  ['sqrt(2)/2','OMIT_ADDEND','只完成有理化，漏加√8','1/sqrt(2)'],
  ['3sqrt(2)/2','DROP_EXTRACTED_FACTOR','把√8化簡時漏掉係數2','1/sqrt(2)+sqrt(2)'],
  ['5sqrt(2)','DROP_FINAL_DENOMINATOR','合併係數分數後漏掉分母2','5sqrt(2)'],
  ['sqrt(2)/6','EXTEND_DENOMINATOR_SCOPE','錯把後面的加項也併入分母','1/(sqrt(2)+sqrt(8))']
 ]),
 q(7,'三色晶橋','2/sqrt(3)+sqrt(12)','8sqrt(3)/3',['RATIONALIZE_DENOMINATOR','SIMPLIFY_ROOT','COMMON_DENOMINATOR'],[
  ['4sqrt(3)','DROP_RATIONALIZED_DENOMINATOR','有理化後漏掉分母3','2sqrt(3)+sqrt(12)'],
  ['5sqrt(3)/3','DROP_EXTRACTED_FACTOR','把√12誤化簡成√3','2/sqrt(3)+sqrt(3)'],
  ['4sqrt(3)/3','ADD_NUMERATORS_WITHOUT_CONVERSION','整數係數2未通分就直接加到分子2','(2+2)*sqrt(3)/3'],
  ['2sqrt(3)/3','OMIT_ADDEND','有理化後漏掉第二個加項','2/sqrt(3)'],
  ['8sqrt(3)','DROP_FINAL_DENOMINATOR','合併後漏掉共同分母3','8sqrt(3)']
 ]),
 q(8,'括號晶門','(sqrt(6)/sqrt(2)+1)*sqrt(3)','3+sqrt(3)',['ROOT_QUOTIENT','PARENTHESES','DISTRIBUTION'],[
  ['1+sqrt(3)','OMIT_OUTER_FACTOR','漏掉括號外的√3','sqrt(6)/sqrt(2)+1'],
  ['4','INCOMPLETE_DISTRIBUTION','外面的√3只乘括號第一項','sqrt(6)/sqrt(2)*sqrt(3)+1'],
  ['3sqrt(3)','DIVIDE_ROOTS_AS_SUBTRACT_RADICANDS','相除時錯把根數6與2相減','(sqrt(6-2)+1)*sqrt(3)'],
  ['4sqrt(3)','IGNORE_RADICAL_IN_QUOTIENT','根式相除時忽略根號，直接算6除2','(6/2+1)*sqrt(3)'],
  ['1+2sqrt(3)','MULTIPLY_AS_ADD','把括號外的乘√3誤當加√3','sqrt(6)/sqrt(2)+1+sqrt(3)']
 ]),
 q(9,'逆光晶環','(4/sqrt(3)-sqrt(3))*2','2sqrt(3)/3',['RATIONALIZE_DENOMINATOR','COMMON_DENOMINATOR','PARENTHESES','ORDER_AND_SIGN'],[
  ['6sqrt(3)','DROP_RATIONALIZED_DENOMINATOR','把4/√3誤寫成4√3','(4sqrt(3)-sqrt(3))*2'],
  ['2sqrt(3)','SUBTRACT_WITHOUT_CONVERSION','分數係數減整數時未通分，直接算分子4減1','(4-1)*sqrt(3)/3*2'],
  ['sqrt(3)/3','OMIT_OUTER_FACTOR','漏掉括號外的乘2','4/sqrt(3)-sqrt(3)'],
  ['-2sqrt(3)/3','IGNORE_PARENTHESES','忽略括號，只把減項乘2','4/sqrt(3)-sqrt(3)*2'],
  ['14sqrt(3)/3','SUBTRACT_AS_ADD','把括號內減法誤作加法','(4/sqrt(3)+sqrt(3))*2']
 ]),
 q(10,'礦坑核心','(3/sqrt(2)+sqrt(8))*sqrt(2)-1','6',['RATIONALIZE_DENOMINATOR','SIMPLIFY_ROOT','PARENTHESES','ORDER_AND_SIGN'],[
  ['9','DROP_RATIONALIZED_DENOMINATOR','把3/√2誤寫成3√2','(3sqrt(2)+sqrt(8))*sqrt(2)-1'],
  ['8','SUBTRACT_AS_ADD','最後減1誤作加1','(3/sqrt(2)+sqrt(8))*sqrt(2)+1'],
  ['4','DROP_EXTRACTED_FACTOR','把√8化簡時漏掉係數2','(3/sqrt(2)+sqrt(2))*sqrt(2)-1'],
  ['7','OMIT_SUBTRACTION','忘記最後減1','(3/sqrt(2)+sqrt(8))*sqrt(2)'],
  ['3+3sqrt(2)/2','IGNORE_PARENTHESES','忽略括號，只把√8乘上外面的√2','3/sqrt(2)+sqrt(8)*sqrt(2)-1']
 ])
]);
export const judgeAnswer=(question,input)=>judge(question,input);
function rootInside(n){return n.type==='sqrt'||!!(n.argument&&rootInside(n.argument))||!!(n.left&&(rootInside(n.left)||rootInside(n.right)));}
export function structure(expression){const operators=new Set(),denominators=[];function walk(n,ancestors=[]){if(n.type==='binary'){operators.add(n.operator);if(n.operator==='/'&&rootInside(n.right)){const v=evaluateAst(n.right);if(v.size!==1||[...v.keys()][0]===1n)throw Error('non-monomial-radical-denominator');denominators.push({monomial:true,additionalOperation:ancestors.some(a=>a.type==='binary')});}walk(n.left,[...ancestors,n]);walk(n.right,[...ancestors,n]);}else if(n.argument)walk(n.argument,[...ancestors,n]);}walk(parse(expression));return{operators:[...operators],radicalDenominators:denominators.length,postDivisionOperations:denominators.some(d=>d.additionalOperation)};}
export function validateBank(bank=BANK){
 if(!Array.isArray(bank)||bank.length!==10||new Set(bank.map(q=>q.id)).size!==10)throw Error('invalid-bank-size-or-id');
 const rows=bank.map(question=>{const v=value(question.expression),a=value(question.answer),s=structure(question.expression);if(s.operators.length<2)throw Error('not-mixed:'+question.id);if(!equivalent(v,a)||!inspectFinalSum(parse(question.answer)).satisfied||formatValue(a)!==question.answer)throw Error('invalid-final-answer:'+question.id);if(question.distractors.length!==5)throw Error('invalid-distractor-count');const values=[a];for(const d of question.distractors){const x=value(d.answer);if(!d.concept||!d.explanation||!inspectFinalSum(parse(d.answer)).satisfied||formatValue(x)!==d.answer)throw Error('invalid-distractor:'+d.id);if(values.some(y=>equivalent(x,y)))throw Error('equivalent-choice:'+d.id);if(!equivalent(value(d.misstep),x))throw Error('unverified-misconception:'+d.id);values.push(x);}return{id:question.id,expression:question.expression,answer:question.answer,exact:serialize(a),structure:s,uniqueChoices:values.length,distractors:question.distractors.map(d=>({...d,exact:serialize(value(d.answer))}))};});
 if(rows.filter(q=>q.structure.radicalDenominators&&q.structure.postDivisionOperations).length<4)throw Error('insufficient-rationalization-followup');return rows;
}
export function choices(question,seed){if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('invalid-choice-seed');let mixed=seed;for(const ch of question.id)mixed=Math.imul(mixed^ch.charCodeAt(0),16777619)>>>0;const random=rng(mixed);for(let i=0;i<4;i++)random();const out=[{answer:question.answer,concept:null},...question.distractors.map(d=>({answer:d.answer,concept:d.concept}))];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
// Import fails closed if the bank is invalid. No invalid question can be offered.
validateBank();
