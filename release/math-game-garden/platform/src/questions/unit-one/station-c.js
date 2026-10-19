import { ROOTS } from './blueprints.js';
export function stationC(random, difficulty, _index, mode) {
  if (mode === 'practice') return practiceC(random, difficulty);
  if (mode === 'challenge') return practiceC(random, _index < 2 ? 1 : 3);
  const r = ROOTS[random.int(0, ROOTS.length - 1)], a = random.int(1, 9), c = difficulty === 1 ? 1 : random.int(2, 6), s = difficulty === 3 ? random.int(2, 5) : 1;
  const numerator = difficulty === 3 ? `${a}sqrt(${ROOTS[random.int(0, ROOTS.length - 1)]})` : String(a);
  const denominator = `${c}sqrt(${s * s * r})`;
  return { expression: `(${numerator})/(${denominator})`, taskType: 'rationalize-monomial-denominator', templateId: 'rationalize-monomial',
    instruction: '將分母有理化，並將答案整理成最簡形式。', conceptTags: ['rationalization', 'synchronized-operation', 'fraction-reduction'],
    stepSpec: { numerator, denominator, multiplierExample: `sqrt(${r})` },
    steps: [`分子與分母同乘非零乘數 sqrt(${r})。`, `分母成為 ${c * s * r}，再化簡分子與約分。`] };
}

function practiceC(random, difficulty) {
  const roots = [2, 3, 5, 6, 7], r = roots[random.int(0, roots.length - 1)];
  const a = random.int(1, 5), c = difficulty < 3 ? 1 : random.int(2, 5);
  const numerator = String(a), denominator = `${c}sqrt(${r})`;
  return { expression: `(${numerator})/(${denominator})`, taskType: 'rationalize-monomial-denominator', templateId: 'rationalize-monomial',
    instruction: '將分母有理化，並將答案整理成最簡形式。',
    conceptTags: ['rationalization', 'synchronized-operation', 'fraction-reduction'],
    stepSpec: { numerator, denominator, multiplierExample: `sqrt(${r})` },
    steps: [`分母有 √${r}，選擇有理化乘數 √${r}。`,
      `分子與分母同乘 √${r}：(${a} × √${r})／(${c}√${r} × √${r})。`,
      `分子為 ${a}√${r}；分母為 ${c} × ${r} = ${c * r}。`,
      `得到 ${a}√${r}／${c * r}，再檢查分子係數與分母是否可約分。`] };
}
