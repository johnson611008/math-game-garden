import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { evaluate, evaluateExpression, inputFailure } from './evaluator.js';
import { evaluateSquareDecomposition, evaluateMultiplier, evaluateSynchronizedOperation } from './steps.js';
import { equivalent, serialize } from '../math/radical-value.js';
import { EngineError, fail, bounded } from '../math/errors.js';
import { diagnose } from './diagnostic-rules.js';

const value = text => evaluateAst(parse(text));
const wrong = code => ({status:'incorrect',accepted:false,consumesFirst:true,reasonCodes:[code]});
const integer = text => { const v=value(text), q=v.get(1n); return v.size===1 && q?.d===1n && q.n>0n ? q.n : null; };
const same = (a,b) => equivalent(value(a),value(b));

/** Complete bundle only. Draft operations must never call this function. */
export function evaluateChallengeBundle(question, response) {
  const q=question, r=response;
  if (q?.challengeContractVersion!==1 || q.interactionSpec?.schemaVersion!==1) fail('invalid-contract','未知的挑戰作答包版本。');
  const kind=q.interactionSpec.kind;
  const expectedKind=q.station==='A' ? q.taskType==='largest-square-factor'?'square-factor':'decomposition-and-answer' : q.station==='B'?'judgment-and-correction':q.station==='C'?'rationalization-bundle':null;
  if (!expectedKind || kind!==expectedKind) fail('invalid-contract','工作站與作答包不一致。');
  const fields=[];
  const need=(name,text)=>fields.push({name,text});
  try {
    if (!r || typeof r!=='object' || Array.isArray(r)) fail('invalid-input','請完成本題作答。');
    if (q.station==='A') {
      need('squareFactor',r.squareFactor);need('remainder',r.remainder);
      if(kind!=='square-factor') {
        need('answer',r.answer);
        if(!Array.isArray(r.path)||!r.path.length) fail('invalid-input','請保留至少一個分解步驟。');
        if(r.path.length>16) fail('resource-limit','分解路徑最多16步。');
        r.path.forEach((step,i)=>{for(const f of ['inputRadicand','squareFactor','remainder','extractedCoefficient']) need(`path.${i}.${f}`,step?.[f]);});
      }
    } else if(q.station==='B') {
      if(typeof r.isSimplest!=='boolean') fail('invalid-input','請先完成最簡形式判斷。');
      if(!r.isSimplest) need('correctedAnswer',r.correctedAnswer);
    } else for(const f of ['numeratorMultiplier','denominatorMultiplier','transformedNumerator','transformedDenominator','answer']) need(f,r[f]);
    // Preflight ALL fields before publishing any mathematical subresult.
    const domain=[]; const errors=[];
    for(const f of fields) {
      try { parse(f.text); value(f.text); }
      catch(e) { if(!(e instanceof EngineError)) throw e; (e.code==='domain-error'?domain:errors).push({...inputFailure(e),field:f.name}); }
    }
    if(errors.length) return {...errors[0],parts:null,wholeCorrect:false,diagnosis:[]};
    if(domain.length) {
      let parts;
      if(q.station==='B') {
        const b=evaluate(q,{isSimplest:r.isSimplest,...(!r.isSimplest?{correctedAnswer:r.correctedAnswer}:{})});
        return {...b,parts:{judgment:{accepted:b.judgmentCorrect},correction:b.correction},wholeCorrect:false,
          diagnosis:[...diagnose(b,q),...domain.map(d=>({conceptId:'domain',evidence:d.field,certainty:'candidate'}))]};
      }
      if(q.station==='C') parts={multiplier:evaluateMultiplier(q.stepSpec.denominator,r.denominatorMultiplier),
        synchronized:evaluateSynchronizedOperation({...r,numerator:q.stepSpec.numerator,denominator:q.stepSpec.denominator}),final:evaluate(q,{answer:r.answer})};
      else parts={decomposition:evaluateSquareDecomposition(q.decompositionSpec.radicand,r,q.decompositionSpec.requirement),
        ...(kind==='square-factor'?{}:{path:{status:'not-evaluated',accepted:false,reason:'整組包含定義域錯誤，路徑完整檢查未執行。'},final:evaluate(q,{answer:r.answer})})};
      return {...domain[0],parts:{...parts,domain},wholeCorrect:false,diagnosis:domain.map(d=>({conceptId:'domain',evidence:d.field,certainty:'candidate'}))};
    }
    let parts;
    if(q.station==='B') {
      // Ignore an unused hidden correction on the student's true branch.
      const b=evaluate(q,{isSimplest:r.isSimplest,...(!r.isSimplest?{correctedAnswer:r.correctedAnswer}:{})});
      return {...b,wholeCorrect:b.accepted,parts:{judgment:{accepted:b.judgmentCorrect},correction:b.correction},diagnosis:diagnose(b,q)};
    }
    if(q.station==='C') {
      parts={multiplier:evaluateMultiplier(q.stepSpec.denominator,r.denominatorMultiplier),
        synchronized:evaluateSynchronizedOperation({...r,numerator:q.stepSpec.numerator,denominator:q.stepSpec.denominator}),
        final:evaluate(q,{answer:r.answer})};
    } else {
      const decomposition=(n,s,rest,requirement='valid-square-factor')=> {
        if(![n,s,rest].every(x=>integer(x)!==null)) return wrong('INVALID_DECOMPOSITION_INTEGER');
        return evaluateSquareDecomposition(n,{squareFactor:s,remainder:rest},requirement);
      };
      const n=q.decompositionSpec.radicand;
      parts={decomposition:decomposition(n,r.squareFactor,r.remainder,q.decompositionSpec.requirement)};
      if(kind!=='square-factor') {
        let previous=n, product=1n;
        const steps=r.path.map(step=>{
          const integers=['inputRadicand','squareFactor','remainder','extractedCoefficient'].every(f=>integer(step[f])!==null);
          const factor=integer(step.squareFactor);
          if(factor!==null) product=bounded(product*factor);
          const result=decomposition(step.inputRadicand,step.squareFactor,step.remainder);
          const linked=same(step.inputRadicand,previous);
          const coefficientCorrect=integers && evaluateExpression(serialize(value(`sqrt(${step.squareFactor})`)),step.extractedCoefficient,'equivalent').accepted;
          previous=step.remainder;
          return {...result,linked,coefficientCorrect,accepted:result.accepted&&linked&&coefficientCorrect,
            reasonCodes:[...(result.reasonCodes||[]),...(!linked?['BROKEN_DECOMPOSITION_CHAIN']:[]),...(!coefficientCorrect?['EXTRACTED_COEFFICIENT_ERROR']:[])]};
        });
        const aggregateCorrect=integer(r.squareFactor)===product && same(previous,r.remainder);
        parts.path={status:steps.every(s=>s.accepted)&&aggregateCorrect?'correct':'incorrect',accepted:steps.every(s=>s.accepted)&&aggregateCorrect,steps,aggregateCorrect,
          reasonCodes:[...steps.flatMap(s=>s.reasonCodes),...(!aggregateCorrect?['DECOMPOSITION_AGGREGATE_ERROR']:[])]};
        parts.final=evaluate(q,{answer:r.answer});
      }
    }
    const list=Object.values(parts);
    const resource=[...list,...(parts.path?.steps||[])].find(p=>p.status==='resource-limit');
    if(resource) return {...resource,consumesFirst:false,parts:null,wholeCorrect:false,diagnosis:[]};
    const accepted=list.every(p=>p.accepted);
    const onlyFinal=parts.final?.status==='equivalent-not-simplest' && list.filter(p=>p!==parts.final).every(p=>p.accepted);
    const reasonCodes=[...new Set(list.flatMap(p=>p.reasonCodes||[]))];
    const result={status:accepted?'correct':onlyFinal?'equivalent-not-simplest':'incorrect',accepted,wholeCorrect:accepted,consumesFirst:true,
      parts,reasonCodes,message:accepted?'整組修復正確。':onlyFinal?'數值等值，但尚未最簡。':'這組操作還有需要修正的地方。'};
    return {...result,diagnosis:[...diagnose(result,q),...Object.entries(parts).filter(([,p])=>!p.accepted).map(([part])=>({conceptId:part==='final'?'radical-simplification':q.station==='A'?'square-factor':part==='multiplier'?'rationalizing-multiplier':'synchronized-operation',evidence:part,certainty:'candidate'}))]};
  } catch(e) {
    if(!(e instanceof EngineError)) throw e;
    const result=inputFailure(e);return {...result,parts:null,wholeCorrect:false,diagnosis:[]};
  }
}
