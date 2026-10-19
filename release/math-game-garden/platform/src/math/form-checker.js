import { decimalQ, gcd } from './rational.js';
import { squareParts } from './integer-factorization.js';

// Structural monomial inspection preserves unreduced fractions and unfinished steps.
export function inspectSimplest(ast) {
  const reasons = new Set();
  function inspect(n) {
    if (n.type === 'number') { const q = decimalQ(n.text); return { n: q.n, d: q.d, roots: 0, r: 1n, scalars: q.n === 1n ? 0 : 1 }; }
    if (n.type === 'unary') { const t = inspect(n.argument); if (n.argument.type === 'unary') reasons.add('REDUNDANT_OPERATION'); if (n.operator === '-') t.n = -t.n; return t; }
    if (n.type === 'sqrt') {
      if (n.argument.type !== 'number' || n.argument.text.includes('.')) { reasons.add('RADICAND_NOT_SIMPLE_INTEGER'); return { n: 1n, d: 1n, roots: 1, r: 1n, scalars: 0 }; }
      const r = BigInt(n.argument.text), parts = squareParts(r);
      if (r <= 1n || parts.inside === 1n) reasons.add('PERFECT_SQUARE_NOT_EVALUATED');
      else if (parts.outside !== 1n) reasons.add('SQUARE_FACTOR_LEFT');
      return { n: 1n, d: 1n, roots: 1, r, scalars: 0 };
    }
    if (n.type === 'binary' && (n.operator === '*' || n.operator === '/')) {
      const a = inspect(n.left), b = inspect(n.right);
      if (n.operator === '/') {
        if (b.roots) reasons.add('DENOMINATOR_RADICAL');
        if (b.n < 0n) reasons.add('NEGATIVE_DENOMINATOR');
        if (b.d !== 1n) reasons.add('UNFINISHED_OPERATION');
        if (a.d !== 1n) reasons.add('UNFINISHED_OPERATION');
        return { n: a.n * b.d, d: a.d * b.n, roots: a.roots + b.roots, r: a.r * b.r, scalars: a.scalars };
      }
      if (a.roots && b.roots) reasons.add('UNFINISHED_OPERATION');
      if (a.scalars + b.scalars > 1) reasons.add('UNFINISHED_OPERATION');
      // Explicit redundant multiplication/division by one is not required for equivalence.
      if ((n.left.type === 'number' && n.left.text === '1') || (n.right.type === 'number' && n.right.text === '1')) reasons.add('REDUNDANT_OPERATION');
      return { n: a.n * b.n, d: a.d * b.d, roots: a.roots + b.roots, r: a.r * b.r, scalars: a.scalars + b.scalars };
    }
    reasons.add('UNFINISHED_OPERATION'); return { n: 1n, d: 1n, roots: 0, r: 1n, scalars: 0 };
  }
  const t = inspect(ast);
  if (t.d && gcd(t.n, t.d) > 1n) reasons.add('FRACTION_NOT_REDUCED');
  if (!t.n && (t.roots || ast.type === 'binary')) reasons.add('ZERO_NOT_SIMPLIFIED');
  if (t.roots > 1) reasons.add('UNFINISHED_OPERATION');
  if (ast.type === 'binary' && ast.operator === '/' && ast.right.type === 'number' && ast.right.text === '1') reasons.add('REDUNDANT_OPERATION');
  return { satisfied: !reasons.size, reasonCodes: [...reasons] };
}
