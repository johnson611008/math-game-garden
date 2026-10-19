import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { plus, rootOf, equivalent, deserialize, term } from '../math/radical-value.js';
import { squareParts } from '../math/integer-factorization.js';
import { EngineError } from '../math/errors.js';
export const conceptForReason = Object.freeze({
  SQUARE_FACTOR_LEFT: 'square-factor', RADICAND_NOT_SIMPLE_INTEGER: 'square-factor',
  PERFECT_SQUARE_NOT_EVALUATED: 'perfect-square', FRACTION_NOT_REDUCED: 'fraction-reduction',
  DENOMINATOR_RADICAL: 'rationalization', ONE_SIDE_MULTIPLIED: 'synchronized-operation',
  MULTIPLIER_DOES_NOT_RATIONALIZE: 'rationalizing-multiplier',
  SIMPLEST_JUDGMENT_ERROR: 'simplest-judgment', VALUE_MISMATCH: 'other-math-error',
  SIGN_ERROR: 'sign', ROOT_FACTOR_LOST: 'root-factor', FALSE_SQRT_DISTRIBUTION: 'sqrt-distribution',
});
export function diagnose(result, question) {
  const codes = [...(result.reasonCodes || [])];
  if (result.equivalent === false && result.normalizedValue && question?.source) {
    try {
      const ast = parse(question.source), value = deserialize(result.normalizedValue);
      const radical = ast.type === 'sqrt' ? ast : ast.type === 'binary' && ast.operator === '*' && ast.right.type === 'sqrt' ? ast.right : null;
      if (radical?.argument.type === 'number' && /^[0-9]+$/.test(radical.argument.text)) {
        const parts = squareParts(BigInt(radical.argument.text));
        if (parts.outside > 1n && equivalent(value, term(parts.inside))) codes.push('ROOT_FACTOR_LOST');
      }
      if (ast.type === 'sqrt' && ast.argument.type === 'binary' && ast.argument.operator === '+') {
        if (equivalent(value, plus(rootOf(evaluateAst(ast.argument.left)), rootOf(evaluateAst(ast.argument.right))))) codes.push('FALSE_SQRT_DISTRIBUTION');
      }
    } catch (error) { if (!(error instanceof EngineError)) throw error; /* Unsupported diagnostic route remains unknown, not a student verdict. */ }
  }
  const specific = codes.some(code => !['VALUE_MISMATCH', 'UNFINISHED_OPERATION'].includes(code) && conceptForReason[code]);
  return [...new Set(codes)].filter(code => !(specific && code === 'VALUE_MISMATCH')).map(code => ({ conceptId: conceptForReason[code] || 'other-math-error', evidence: code, certainty: 'candidate' }));
}
