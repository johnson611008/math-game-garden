import { rational, addQ, mulQ, divQ, negQ, equalQ } from './rational.js';
import { squareParts } from './integer-factorization.js';
import { fail, bounded } from './errors.js';

// Map<square-free bigint, normalized rational>. No floating point values.
export const fromRational = q => q.n ? new Map([[1n, q]]) : new Map();
export function term(r, q = rational(1n)) {
  const { outside, inside } = squareParts(r);
  return fromTerm(inside, mulQ(q, rational(outside)));
}
function fromTerm(r, q) { return q.n ? new Map([[r, q]]) : new Map(); }
export function plus(a, b) {
  const out = new Map(a);
  for (const [r, q] of b) { const v = addQ(out.get(r) || rational(0n), q); if (v.n) out.set(r, v); else out.delete(r); }
  if (out.size > 64) fail('resource-limit', '根式項數超過上限。');
  return out;
}
export const negative = a => new Map([...a].map(([r, q]) => [r, negQ(q)]));
export function times(a, b) {
  let out = new Map();
  for (const [r, q] of a) for (const [s, v] of b) {
    // Extract shared factors first to avoid unnecessarily large factorizations.
    let x = r, y = s; while (y) [x, y] = [y, x % y];
    const root = bounded((r / x) * (s / x));
    if (root > 1000000n) fail('resource-limit', '結果根數超過目前支援上限。');
    out = plus(out, fromTerm(root, mulQ(mulQ(q, v), rational(x))));
  }
  return out;
}
export function divide(a, b) {
  if (!b.size) fail('domain-error', '分母不能為零。');
  if (b.size !== 1) fail('unsupported-expression', '目前尚未支援雙項或多項根式分母。');
  const [[r, q]] = b;
  return times(a, fromTerm(r, divQ(rational(1n), mulQ(q, rational(r)))));
}
export function rootOf(a) {
  if (!a.size) return new Map();
  if (a.size !== 1 || !a.has(1n)) fail('unsupported-expression', '目前尚未支援根式內再含根式。');
  const q = a.get(1n);
  if (q.n < 0n) fail('domain-error', '目前只支援實數平方根。');
  return term(bounded(q.n * q.d), rational(1n, q.d));
}
export const equivalent = (a, b) => a.size === b.size && [...a].every(([r, q]) => b.has(r) && equalQ(q, b.get(r)));
export function serialize(value) {
  return { kind: 'radical-sum', terms: [...value].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([r, q]) => ({ radicand: String(r), coefficient: { numerator: String(q.n), denominator: String(q.d) } })) };
}
export function deserialize(data) {
  if (data?.kind !== 'radical-sum' || !Array.isArray(data.terms) || data.terms.length > 64) fail('invalid-contract', '無效的根式資料。');
  const out = new Map();
  let previousRoot = 0n;
  for (const t of data.terms) {
    if (!t || typeof t.radicand !== 'string' || typeof t.coefficient?.numerator !== 'string' || typeof t.coefficient?.denominator !== 'string' || !/^[1-9][0-9]{0,11}$/.test(t.radicand) || !/^-?(0|[1-9][0-9]*)$/.test(t.coefficient.numerator) || !/^[1-9][0-9]*$/.test(t.coefficient.denominator)) fail('invalid-contract', '無效的精確數值。');
    if (t.coefficient.numerator.length > 1235 || t.coefficient.denominator.length > 1234) fail('resource-limit', '精確數值過大。');
    const r = BigInt(t.radicand), n = BigInt(t.coefficient.numerator), d = BigInt(t.coefficient.denominator), q = rational(n, d);
    if (!n || q.n !== n || q.d !== d || r <= previousRoot || squareParts(r).outside !== 1n) fail('invalid-contract', '根式資料未正規化。');
    out.set(r, q); previousRoot = r;
  }
  return out;
}
