import { fail } from './errors.js';
export function squareParts(n) {
  if (n < 0n) fail('domain-error', '目前只支援實數平方根。');
  if (n > 1000000n) fail('resource-limit', '需分解的被開方數不得超過 1000000。');
  if (!n) return { outside: 0n, inside: 1n };
  let outside = 1n, inside = 1n, rest = n;
  for (let p = 2n; p * p <= rest; p++) {
    let exponent = 0;
    while (rest % p === 0n) { rest /= p; exponent++; }
    outside *= p ** BigInt(Math.floor(exponent / 2));
    if (exponent % 2) inside *= p;
  }
  if (rest > 1n) inside *= rest;
  return { outside, inside };
}
export const largestSquareFactor = n => { if (n <= 0n) fail('domain-error', '最大完全平方因數只對正整數定義。'); const { outside } = squareParts(n); return outside * outside; };
