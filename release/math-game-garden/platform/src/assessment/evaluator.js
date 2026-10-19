import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { deserialize, serialize, equivalent, negative } from '../math/radical-value.js';
import { inspectSimplest } from '../math/form-checker.js';
import { EngineError } from '../math/errors.js';

const messages = {
  correct: '答案正確。', 'equivalent-not-simplest': '數值等值，但尚未最簡。',
  incorrect: '答案尚未符合題目要求。',
};
export function inspectAnswer(input) {
  const ast = parse(input), value = evaluateAst(ast);
  return { ast, value, form: inspectSimplest(ast) };
}
export function inputFailure(error) {
  if (!(error instanceof EngineError) || !['invalid-input', 'domain-error', 'unsupported-expression', 'resource-limit'].includes(error.code)) throw error;
  return { status: error.code, equivalent: null, formSatisfied: false, accepted: false,
    consumesFirst: error.code === 'domain-error', reasonCodes: [error.code], message: error.message };
}
export function evaluateExpression(expectedValue, input, requiredForm = 'simplest-monomial') {
  if (!['simplest-monomial', 'equivalent'].includes(requiredForm)) throw new EngineError('invalid-contract', '未知的答案形式要求。');
  const expected = deserialize(expectedValue); // Contract errors are developer errors, not student wrong answers.
  try {
    const { value, form } = inspectAnswer(input), eq = equivalent(expected, value);
    const formSatisfied = requiredForm === 'equivalent' || form.satisfied;
    const accepted = eq && formSatisfied;
    const status = accepted ? 'correct' : eq ? 'equivalent-not-simplest' : 'incorrect';
    return { status, equivalent: eq, formSatisfied, accepted, consumesFirst: true,
      normalizedValue: serialize(value), reasonCodes: eq ? (formSatisfied ? [] : form.reasonCodes) : ['VALUE_MISMATCH', ...(expected.size && equivalent(negative(expected), value) ? ['SIGN_ERROR'] : []), ...form.reasonCodes], message: messages[status] };
  } catch (error) { return inputFailure(error); }
}
export function evaluate(question, response) {
  if (!['simplify', 'largest-square-factor', 'rationalize-monomial-denominator', 'judge-and-correct'].includes(question.taskType)) throw new EngineError('invalid-contract', '未知的題目類型。');
  if (question.taskType !== 'judge-and-correct') return evaluateExpression(question.answerSpec.expectedValue, response?.answer, question.answerSpec.requiredForm);
  const expectedJudgment = question.answerSpec.isSimplest;
  if (typeof expectedJudgment !== 'boolean') throw new EngineError('invalid-contract', 'B 站缺少最簡形式標記。');
  const judgmentCorrect = response?.isSimplest === expectedJudgment;
  if (typeof response?.isSimplest !== 'boolean') return { ...inputFailure(new EngineError('invalid-input', '請先完成最簡形式判斷。')), judgmentCorrect: null, correctionCorrect: null };
  // Completeness follows the student's selected branch, never a hidden expected answer.
  // Choosing "already simplest" on a non-simple expression is a complete but wrong answer.
  const correctionRequired = response.isSimplest === false;
  const correction = correctionRequired || (!expectedJudgment && typeof response.correctedAnswer === 'string') ? evaluateExpression(question.answerSpec.expectedValue, response.correctedAnswer, 'simplest-monomial') : null;
  const correctionCorrect = correction ? correction.accepted : expectedJudgment ? null : false;
  if (correction && !correction.consumesFirst) return { ...correction, judgmentCorrect, correctionCorrect, wholeCorrect: false };
  const accepted = judgmentCorrect && (expectedJudgment || correctionCorrect);
  const status = accepted ? 'correct' : correction?.status === 'domain-error' ? 'domain-error' : 'incorrect';
  return { status, accepted, wholeCorrect: accepted, consumesFirst: true, judgmentCorrect,
    correctionCorrect, correctionRequired, correction, equivalent: correction?.equivalent ?? null,
    formSatisfied: correction?.formSatisfied ?? expectedJudgment,
    reasonCodes: [...(!judgmentCorrect ? ['SIMPLEST_JUDGMENT_ERROR'] : []), ...(correction?.reasonCodes || [])],
    message: accepted ? messages.correct : correction?.status === 'equivalent-not-simplest' ? messages['equivalent-not-simplest'] : messages.incorrect };
}
