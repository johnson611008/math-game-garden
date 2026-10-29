import{parse}from'../src/input/parser.js';import{evaluateAst}from'../src/math/operations.js';import{equivalent,serialize}from'../src/math/radical-value.js';import{inspectSimplest}from'../src/math/form-checker.js';import{inputFailure}from'../src/assessment/evaluator.js';
export const value=s=>evaluateAst(parse(s));
export const TASKS=Object.freeze([
 {id:'direct-1',title:'晶核點火',expression:'sqrt(3)*sqrt(3)+2',text:'√3 × √3 ＋ 2',answer:'5',concept:'先乘後加',hint:'先算根號的乘法，再把整數加起來。'},
 {id:'direct-2',title:'雙色晶光',expression:'2sqrt(2)+sqrt(2)*sqrt(2)',text:'2√2 ＋ √2 × √2',answer:'2+2sqrt(2)',concept:'整數與根式分開',hint:'先做乘法，再判斷剩下的是整數還是根式。不同類的項不能硬合併。'},
 {id:'direct-3',title:'森林微光',expression:'sqrt(12)+sqrt(3)*2',text:'√12 ＋ √3 × 2',answer:'4sqrt(3)',concept:'化簡與同類項',hint:'把能化簡的根式整理好，乘法先做，最後合併同類根式。'},
 {id:'direct-4',title:'月光聚能',expression:'(sqrt(3)+2sqrt(3))*sqrt(3)',text:'(√3 ＋ 2√3) × √3',answer:'9',concept:'括號優先',hint:'先完成括號內的同類根式加法，再乘上外面的根式。'},
 {id:'direct-5',title:'森林之心',expression:'sqrt(18)+sqrt(2)*sqrt(8)-2',text:'√18 ＋ √2 × √8 − 2',answer:'2+3sqrt(2)',concept:'化簡、先乘後加減',hint:'先做乘法，也別忘了化簡根式。最後分別整理整數與同類根式。'},
]);
// Additive final answers may have multiple unlike terms. Inspect each monomial
// with the existing structural checker, then reject repeated radicals and zeros.
export function inspectFinalSum(ast){let terms=[];function collect(n,sign=1){if(n.type==='binary'&&['+','-'].includes(n.operator)){collect(n.left,sign);collect(n.right,n.operator==='-'?-sign:sign);}else terms.push({ast:n,sign});}collect(ast);let roots=new Set(),reasons=new Set();for(let t of terms){let f=inspectSimplest(t.ast);for(let r of f.reasonCodes)reasons.add(r);let v=evaluateAst(t.ast);if(!v.size&&terms.length>1)reasons.add('ZERO_TERM');if(v.size>1)reasons.add('UNFINISHED_OPERATION');for(let [r]of v){if(roots.has(r))reasons.add('LIKE_TERMS_LEFT');roots.add(r);}}return {satisfied:!reasons.size,reasonCodes:[...reasons]};}
export function judge(task,input){try{const ast=parse(input),v=evaluateAst(ast),eq=equivalent(v,value(task.answer)),form=inspectFinalSum(ast);return {accepted:eq&&form.satisfied,equivalent:eq,consumesFirst:true,status:eq?(form.satisfied?'correct':'equivalent-not-simplest'):'incorrect',reasonCodes:form.reasonCodes};}catch(e){return inputFailure(e);}}
export function validateBank(){return TASKS.map(t=>{let expected=value(t.expression),answer=value(t.answer);if(!equivalent(expected,answer)||!inspectFinalSum(parse(t.answer)).satisfied)throw Error('invalid-task-'+t.id);let operators=new Set();function visit(n){if(n.type==='binary'){operators.add(n.operator);visit(n.left);visit(n.right);}if(n.argument)visit(n.argument);}visit(parse(t.expression));if(operators.size<2)throw Error('not-mixed');return {id:t.id,expression:t.expression,answer:t.answer,operators:[...operators],exact:serialize(answer),valid:true};});}
validateBank();
export class DirectRound{
 constructor(){this.history=[];this.roundId=0;this.restart();}
 restart(){if(this.records)this.history.push(structuredClone(this.records));this.roundId++;this.index=0;this.records=TASKS.map(t=>({taskId:t.id,draft:'',first:null,attempts:[],hints:0,completed:false}));this.notice='';}
 get task(){return TASKS[this.index];}get record(){return this.records[this.index];}
 edit(answer){if(this.record.completed||typeof answer!=='string'||answer.length>256)return false;this.record.draft=answer;return true;}
 submit(){let r=this.record;if(r.completed)return {accepted:false,closed:true};if(r.attempts.some(a=>a.answer===r.draft.trim()))return {accepted:false,duplicate:true};const result=judge(this.task,r.draft),attempt={answer:r.draft.trim(),result:structuredClone(result),kind:r.first?'correction':'first'};r.attempts.push(attempt);if(result.consumesFirst&&!r.first)r.first=structuredClone(attempt);if(result.accepted)r.completed=true;return result;}
 hint(){if(!this.record.completed)this.record.hints++;return this.task.hint;}
 navigate(delta){const next=this.index+delta;if(next<0||next>=5||(delta>0&&!this.record.completed))return false;this.index=next;this.notice='';return true;}
}
