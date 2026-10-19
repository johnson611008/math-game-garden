import { bounded, fail } from './errors.js';
export function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
export function rational(n, d = 1n) {
  bounded(n); bounded(d);
  if (!d) fail('domain-error', '分母不能為零。');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); return { n: n / g, d: d / g };
}
export const addQ = (a, b) => rational(bounded(a.n * b.d + b.n * a.d), bounded(a.d * b.d));
export const mulQ = (a, b) => rational(bounded(a.n * b.n), bounded(a.d * b.d));
export const divQ = (a, b) => rational(bounded(a.n * b.d), bounded(a.d * b.n));
export const negQ = a => rational(-a.n, a.d);
export const equalQ = (a, b) => a.n === b.n && a.d === b.d;
export function decimalQ(text) {
  const [whole, part = ''] = text.split('.');
  return rational(BigInt(whole + part), 10n ** BigInt(part.length));
}
