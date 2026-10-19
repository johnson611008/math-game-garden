import { decimalQ } from './rational.js';
import { fromRational, plus, negative, times, divide, rootOf } from './radical-value.js';
import { fail } from './errors.js';
export function evaluateAst(ast) {
  if (ast.type === 'number') return fromRational(decimalQ(ast.text));
  if (ast.type === 'unary') { const a = evaluateAst(ast.argument); return ast.operator === '-' ? negative(a) : a; }
  if (ast.type === 'sqrt') {
    if (containsRoot(ast.argument)) fail('unsupported-expression', '目前尚未支援巢狀根式。');
    return rootOf(evaluateAst(ast.argument));
  }
  if (ast.type === 'binary') {
    const a = evaluateAst(ast.left), b = evaluateAst(ast.right);
    if (ast.operator === '+') return plus(a, b);
    if (ast.operator === '-') return plus(a, negative(b));
    if (ast.operator === '*') return times(a, b);
    if (ast.operator === '/') return divide(a, b);
  }
  fail('invalid-contract', '未知的運算節點。');
}
function containsRoot(n) { return n.type === 'sqrt' || (n.argument && containsRoot(n.argument)) || (n.left && (containsRoot(n.left) || containsRoot(n.right))); }
