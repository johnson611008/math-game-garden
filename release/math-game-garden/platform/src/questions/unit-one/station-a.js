import { ROOTS } from './blueprints.js';
import { powerRadicand } from '../power-presentation.js';
export function stationA(random, difficulty, index, mode, focusConcept) {
  if (index >= 2 && !(mode === 'remediation' && focusConcept === 'sign')) {
    // Practice products stay short; single-base questions favor odd powers.
    const smallNumbers = mode === 'practice' || mode === 'challenge';
    const practiceProduct = smallNumbers && index % 2 === 1;
    const bases = [2, 3, 5, 7];
    const base = practiceProduct ? [2, 3][random.int(0, 1)] : bases[random.int(0, 3)];
    const practiceExponents = [3, 3, 3, 5, 5, 5, 2, 4];
    const exponent = practiceProduct ? 3 : smallNumbers ? practiceExponents[random.int(0, 7)] : random.int(2, 5);
    const factors = [{ base, exponent }];
    if (index % 2 === 1) {
      const other = (practiceProduct ? [2, 3] : bases).filter(b => b !== base);
      factors.push({ base: other[random.int(0, other.length - 1)], exponent: 2 });
    }
    const presentation = { schemaVersion: 1, type: 'power-radical', factors };
    const n = powerRadicand(presentation);
    const even = factors.map(f => ({ ...f, even: f.exponent - f.exponent % 2, remaining: f.exponent % 2 }));
    const coefficient = even.reduce((a, f) => a * BigInt(f.base) ** BigInt(f.even / 2), 1n);
    const remainder = even.reduce((a, f) => a * BigInt(f.remaining ? f.base : 1), 1n);
    const superscript = n => String(n).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return { expression: `sqrt(${n})`, presentation, taskType: 'simplify',
      templateId: factors.length === 1 ? 'extract-even-power' : 'extract-power-product',
      instruction: '將含指數的根式化為最簡形式。', conceptTags: ['square-factor', 'radical-simplification'],
      decompositionSpec: { radicand: n, requirement: 'valid-square-factor' },
      steps: [
        `拆出偶數次方：${even.map(f => `${f.base}${superscript(f.exponent)} = ${f.base}${superscript(f.even)}${f.remaining ? ` × ${f.base}` : ''}`).join('；')}。`,
        `將偶數次方提出根號：${even.map(f => `${f.base}${superscript(f.even / 2)}`).join(' × ')}${remainder === 1n ? '' : ` × √${remainder}`}。`,
        `算出根號外的係數：${coefficient}。`,
        `最簡根式：${coefficient}${remainder === 1n ? '' : `√${remainder}`}。`,
      ] };
  }
  const pairs = ROOTS.flatMap(r => [2, 3, 4, 5, 6, 7].filter(s => s * s * r <= 100).map(s => [r, s]));
  const [r, s] = pairs[random.int(0, pairs.length - 1)];
  const n = s * s * r;
  if (index === 0) return { expression: `sqrt(${n})`, expectedExpression: String(s * s), taskType: 'largest-square-factor', templateId: 'largest-square-factor',
    instruction: '找出被開方數的最大完全平方因數。', conceptTags: ['square-factor'],
    decompositionSpec: { radicand: String(n), requirement: 'largest-square-factor' },
    steps: [`${n} = ${s * s} × ${r}；${r} 沒有大於 1 的平方因數。`, `最大完全平方因數是 ${s * s}。`] };
  const negativeFocus = mode === 'remediation' && index >= 2 && focusConcept === 'sign';
  const coefficient = negativeFocus ? -random.int(2, 5) : 1;
  return { expression: `${coefficient}*sqrt(${n})`, expectedExpression: `${coefficient * s}sqrt(${r})`, taskType: 'simplify', templateId: 'extract-square-factor',
    instruction: '將根式化為最簡形式；可使用任何正確的平方因數分解路徑。', conceptTags: ['square-factor', 'radical-simplification'],
    decompositionSpec: { radicand: String(n), requirement: 'valid-square-factor' },
    steps: [`${n} = ${s * s} × ${r}。`, `sqrt(${n}) = ${s}sqrt(${r})。`, `保留外係數：${coefficient * s}sqrt(${r})。`] };
}
