import { ROOTS } from './blueprints.js';
export function stationB(random, difficulty, index, mode, focusConcept) {
  if (mode === 'practice') return practiceB(random, index);
  if (mode === 'challenge') return practiceB(random, index, index % 2 === 0);
  const r = ROOTS[random.int(0, ROOTS.length - 1)], a = random.int(2, 9), s = random.int(2, 9);
  const focused = mode === 'remediation' && index >= 2 && ['perfect-square', 'fraction-reduction', 'rationalization', 'square-factor', 'root-factor'].includes(focusConcept);
  const isSimplest = focused ? false : mode === 'challenge' ? index % 2 === 0 : index < 2 ? index === 0 : random.int(0, 1) === 1;
  let expression, expectedExpression;
  if (isSimplest) { expression = difficulty === 1 ? `sqrt(${r})` : `${a}sqrt(${r})`; expectedExpression = expression; }
  else if (focused && focusConcept === 'rationalization') { expression = `${a}/sqrt(${r})`; expectedExpression = `${a}sqrt(${r})/${r}`; }
  else if (focused && focusConcept === 'fraction-reduction') { expression = `${2 * a}sqrt(${r})/4`; expectedExpression = `${a}sqrt(${r})/2`; }
  else if (focused && ['square-factor', 'root-factor'].includes(focusConcept)) { expression = `${a}sqrt(${s * s * r})`; expectedExpression = `${a * s}sqrt(${r})`; }
  else if ((focused && focusConcept === 'perfect-square') || difficulty === 1) { expression = `sqrt(${s * s})`; expectedExpression = String(s); }
  else if (difficulty === 2) { expression = `${a}sqrt(${s * s * r})`; expectedExpression = `${a * s}sqrt(${r})`; }
  else { expression = `${2 * a}sqrt(${s * s * r})/4`; expectedExpression = `${a * s}sqrt(${r})/2`; }
  return { expression, expectedExpression, isSimplest, taskType: 'judge-and-correct', templateId: isSimplest ? 'already-simplest' : 'repair-simplest',
    instruction: '判斷是否為最簡形式；若不是，請提供最簡答案。', conceptTags: ['simplest-judgment', 'radical-simplification', ...(difficulty === 3 ? ['fraction-reduction'] : []), ...(focused ? [focusConcept] : [])],
    steps: [isSimplest ? '根號內沒有可提出的平方因數，且沒有待約分或有理化的分母。' : '檢查平方因數、完全平方根與分數約分。'] };
}

function practiceB(random, index, forcedJudgment = null) {
  const isSimplest = forcedJudgment ?? (index === 0 || (index > 1 && random.int(0, 1) === 1));
  const a = random.int(1, 3);
  const pool = isSimplest ? [[2, 1, 2], [3, 1, 3], [5, 1, 5], [6, 1, 6], [7, 1, 7]] :
    [[12, 2, 3], [18, 3, 2], [20, 2, 5], [28, 2, 7], [32, 4, 2], [45, 3, 5], [48, 4, 3], [50, 5, 2], [72, 6, 2]];
  const [n, s, r] = pool[random.int(0, pool.length - 1)];
  const coefficient = isSimplest || random.int(0, 3) === 0 ? a : 1;
  const expression = `${coefficient === 1 ? '' : coefficient}sqrt(${n})`;
  return { expression, expectedExpression: `${coefficient * s}sqrt(${r})`, isSimplest,
    taskType: 'judge-and-correct', templateId: isSimplest ? 'already-simplest' : 'repair-simplest',
    instruction: '判斷是否為最簡形式；若不是，請提供最簡答案。',
    conceptTags: ['simplest-judgment', 'radical-simplification'],
    steps: isSimplest ? ['根號內沒有大於 1 的平方因數，已是最簡形式。'] :
      [`${n} = ${s * s} × ${r}。`, `√${n} = ${s}√${r}。`, `保留根號外係數，得到 ${coefficient * s}√${r}。`] };
}
