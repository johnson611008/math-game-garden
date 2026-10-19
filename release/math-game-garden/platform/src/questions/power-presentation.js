import { fail } from '../math/errors.js';

// Presentation-only contract: powers never enter the student parser or executable code.
export function powerRadicand(spec) {
  if (spec?.schemaVersion !== 1 || spec.type !== 'power-radical' || !Array.isArray(spec.factors) || spec.factors.length < 1 || spec.factors.length > 2) fail('invalid-contract', '不支援的指數題目結構。');
  let value = 1n;
  const bases = new Set();
  for (const { base, exponent } of spec.factors) {
    if (![2, 3, 5, 7].includes(base) || !Number.isInteger(exponent) || exponent < 2 || exponent > 5 || bases.has(base)) fail('invalid-contract', '指數題目的底數或指數超出範圍。');
    bases.add(base);
    for (let i = 0; i < exponent; i++) value *= BigInt(base);
  }
  return value.toString();
}
export function validatePowerPresentation(question) {
  if (!question.presentation) return;
  const n = powerRadicand(question.presentation);
  if (question.station !== 'A' || question.taskType !== 'simplify' || question.source !== `sqrt(${n})`) fail('invalid-contract', '指數顯示與題目數值不一致。');
}
