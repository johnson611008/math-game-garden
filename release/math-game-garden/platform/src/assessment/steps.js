import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { times, equivalent } from '../math/radical-value.js';
import { largestSquareFactor, squareParts } from '../math/integer-factorization.js';
import { fail } from '../math/errors.js';
import { inputFailure } from './evaluator.js';
const value = text => evaluateAst(parse(text));
function positiveInteger(text) {
  const v = value(text), q = v.get(1n);
  if (v.size !== 1 || !q || q.d !== 1n || q.n <= 0n) fail('invalid-input', '請提供正整數。');
  return q.n;
}
export function evaluateSquareDecomposition(radicand, response, requirement = 'valid-square-factor') {
  try {
    const n = positiveInteger(radicand), s = positiveInteger(response.squareFactor), rest = positiveInteger(response.remainder);
    const largest = largestSquareFactor(n);
    const validPath = squareParts(s).inside === 1n && s * rest === n;
    const isLargest = validPath && s === largest;
    const accepted = validPath && (requirement === 'valid-square-factor' || isLargest);
    if (!['valid-square-factor', 'largest-square-factor'].includes(requirement)) fail('invalid-contract', '未知的分解要求。');
    return { status: accepted ? 'correct' : 'incorrect', accepted, validPath, isLargest,
      reasonCodes: !validPath ? ['INVALID_SQUARE_DECOMPOSITION'] : !accepted ? ['NOT_LARGEST_SQUARE_FACTOR'] : [],
      message: accepted ? '這是正確的平方因數分解路徑。' : validPath ? '分解路徑正確，但本題要求最大完全平方因數。' : '請檢查平方因數與乘積。' };
  } catch (error) { return inputFailure(error); }
}
export function evaluateMultiplier(denominator, multiplier) {
  try {
    const d = value(denominator), m = value(multiplier);
    if (!d.size) fail('domain-error', '原分母不能為零。');
    const product = times(d, m);
    const accepted = !!m.size && product.size === 1 && product.has(1n);
    return { status: accepted ? 'correct' : 'incorrect', accepted, reasonCodes: accepted ? [] : ['MULTIPLIER_DOES_NOT_RATIONALIZE'] };
  } catch (error) { return inputFailure(error); }
}
export function evaluateSynchronizedOperation({ numerator, denominator, numeratorMultiplier, denominatorMultiplier, transformedNumerator, transformedDenominator }) {
  try {
    const n = value(numerator), d = value(denominator), nm = value(numeratorMultiplier), dm = value(denominatorMultiplier);
    if (!d.size) fail('domain-error', '原分母不能為零。');
    const synchronized = !!nm.size && equivalent(nm, dm);
    const numeratorCorrect = equivalent(times(n, nm), value(transformedNumerator));
    const denominatorCorrect = equivalent(times(d, dm), value(transformedDenominator));
    const rationalizing = evaluateMultiplier(denominator, denominatorMultiplier);
    const accepted = synchronized && numeratorCorrect && denominatorCorrect && rationalizing.accepted;
    return { status: accepted ? 'correct' : 'incorrect', accepted, synchronized, numeratorCorrect, denominatorCorrect,
      rationalizing, reasonCodes: [...(!synchronized ? ['ONE_SIDE_MULTIPLIED'] : []), ...(!numeratorCorrect ? ['NUMERATOR_OPERATION_ERROR'] : []), ...(!denominatorCorrect ? ['DENOMINATOR_OPERATION_ERROR'] : []), ...rationalizing.reasonCodes] };
  } catch (error) { return inputFailure(error); }
}
