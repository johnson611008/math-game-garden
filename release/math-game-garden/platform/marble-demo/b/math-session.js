import {questions,questionDeck,correct,QUESTION_VERSION} from './questions.js';
export class MathSession{
 constructor(seed,list=questions){this.deck=questionDeck(seed,list);this.state={schemaVersion:2,questionVersion:QUESTION_VERSION,seed:seed>>>0,cursor:0,active:null,tasks:[],officialResults:Array(10).fill(null),supplements:[],answers:[],completed:0,firstCorrect:0,officialCount:0,officialRate:null,status:'incomplete',earlyImpossible:false,eligibility:'not-implemented'};}
 get current(){return this.state.active?.questionId?this.deck.find(q=>q.id===this.state.active.questionId):null;}
 get task(){return this.state.active?this.state.tasks.find(t=>t.id===this.state.active.taskId):null;}
 next(){const s=this.state,q=this.deck[s.cursor];if(!q)throw Error('題庫耗盡，停止作答，未重複舊題');s.cursor++;s.active.questionId=q.id;this.task.questionIds.push(q.id);}
 start(brickId){const s=this.state;if(s.active||s.tasks.length>=10||(brickId!==null&&s.tasks.some(t=>t.brickId===brickId)))return false;const task={id:'task-'+(s.tasks.length+1),slot:s.tasks.length,brickId,questionIds:[],outcome:'pending'};s.tasks.push(task);s.active={taskId:task.id,questionId:null};this.next();return true;}
 answer(questionId,index){const s=this.state,q=this.current,t=this.task;if(!q||q.id!==questionId||!Number.isInteger(index)||index<0||index>2||s.answers.some(a=>a.questionId===questionId))return {accepted:false};
 const ok=correct(q,index),role=t.questionIds.length===1?'official':'supplement';const record={questionId:q.id,questionVersion:q.version,taskId:t.id,slot:t.slot,role,selectedIndex:index,selectedAnswer:q.options[index],correct:ok,concept:q.misconceptions[index]};s.answers.push(record);
 if(role==='official'){s.officialResults[t.slot]=record;s.officialCount++;if(ok)s.firstCorrect++;}else s.supplements.push(record);
 s.earlyImpossible=s.officialCount-s.firstCorrect>=3;s.status=s.officialCount===10?(s.firstCorrect>=8?'passed':'not-met'):'incomplete';s.officialRate=s.officialCount===10?s.firstCorrect*10:null;
 if(ok||t.questionIds.length===3){t.outcome=ok?'success':'failed';s.completed++;s.active.questionId=null;}else this.next();
 return {accepted:true,correct:ok,role,taskFinished:t.outcome!=='pending',outcome:t.outcome};
 }
 close(){if(!this.task||this.task.outcome==='pending')return false;this.state.active=null;return true;}
 snapshot(){return structuredClone(this.state);}
}
