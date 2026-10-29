import{parse}from'../src/input/parser.js';import{evaluateAst}from'../src/math/operations.js';import{equivalent}from'../src/math/radical-value.js';import{formatValue}from'../src/math/format.js';import{inspectSimplest}from'../src/math/form-checker.js';import{random,shuffle}from'../marble-demo/b/questions.js';
export const BANK_VERSION='WP16-unit2-radical-product-quotient-v2';
const rows=[
 ['sqrt(6)*sqrt(15)','√6 × √15','root-multiplication',['sqrt(21)','sqrt(90)*2']],
 ['sqrt(10)*sqrt(14)','√10 × √14','root-multiplication',['sqrt(24)','sqrt(140)*2']],
 ['sqrt(30)/sqrt(5)','√30 ÷ √5','root-division',['sqrt(25)','sqrt(30)']],
 ['sqrt(42)/sqrt(3)','√42 ÷ √3','root-division',['sqrt(39)','sqrt(42)']],
 ['2sqrt(3)*3sqrt(2)','2√3 × 3√2','coefficient-multiplication',['5sqrt(6)','6sqrt(5)']],
 ['6sqrt(5)/(2sqrt(3))','6√5 ÷ (2√3)','coefficient-division',['3sqrt(2)','3sqrt(15)']],
 ['sqrt(2/3)*sqrt(5)','√(2/3) × √5','fraction-multiplication',['sqrt(10)','sqrt(30)']],
 ['sqrt(5/6)/sqrt(2/3)','√(5/6) ÷ √(2/3)','fraction-division',['sqrt(5)','sqrt(3)/2']],
 ['sqrt(3/5)*sqrt(2)','√(3/5) × √2','fraction-multiplication',['sqrt(6)','sqrt(30)']],
 ['sqrt(7/10)/sqrt(2/5)','√(7/10) ÷ √(2/5)','fraction-division',['sqrt(7)','sqrt(5)/2']],
];
const val=s=>evaluateAst(parse(s));const display=s=>s.replace(/sqrt\((\d+)\)/g,'√$1');
export const questions=rows.flatMap(([expression,text,kind,wrong],i)=>[1,2,3].map((scale,j)=>{const expr=scale===1?expression:`${scale}*(${expression})`,answer=formatValue(val(expr));return{id:`wp16-u2-${i+1}-${j}`,key:expr,version:BANK_VERSION,kind,expression:expr,text:scale===1?text:`${scale} × (${text})`,options:[display(answer),...wrong.map(s=>display(formatValue(val(scale===1?s:`${scale}*(${s})`))))],misconceptions:['CORRECT',kind.includes('fraction')?'FRACTION_ROOT_RULE':'RADICAND_OPERATION',kind.includes('division')?'RATIONALIZATION_FACTOR':'COEFFICIENT_RULE']};}));
export function validateBank(){for(const q of questions){const v=val(q.expression);if(![...v.keys()].some(k=>BigInt(k)!==1n))throw Error('rational-answer-forbidden');const opts=q.options.map(val);if(!equivalent(v,opts[0])||!inspectSimplest(parse(q.options[0])).satisfied)throw Error('invalid-correct-answer');for(let i=0;i<3;i++)for(let j=0;j<i;j++)if(equivalent(opts[i],opts[j]))throw Error('equivalent-options');}return questions;}
export function makePlanV2(seed){validateBank();const rng=random(seed),plan={};for(let i=0;i<10;i++){const qs=questions.slice(i*3,i*3+3).map(q=>{const order=shuffle([0,1,2],rng);return{...q,options:order.map(j=>q.options[j]),misconceptions:order.map(j=>q.misconceptions[j])};});plan[`S${Math.floor(i/2)+1}-Q${i%2+1}`]=qs;}return plan;}
