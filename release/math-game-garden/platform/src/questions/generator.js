import { parse } from '../input/parser.js';
import { evaluateAst } from '../math/operations.js';
import { equivalent, serialize } from '../math/radical-value.js';
import { inspectSimplest } from '../math/form-checker.js';
import { formatValue } from '../math/format.js';
import { fail } from '../math/errors.js';
import { seededRandom } from './seeded-random.js';
import { fingerprint } from './fingerprint.js';
import { BLUEPRINTS, difficultyAt } from './unit-one/blueprints.js';
import { stationA } from './unit-one/station-a.js';
import { stationB } from './unit-one/station-b.js';
import { stationC } from './unit-one/station-c.js';

export const GENERATOR_VERSION = 1;
export function generateQuestions({ unitId = 'simplification', mode, count, seed, quotas, focusByStation = {} }) {
  if (unitId !== 'simplification') fail('unsupported-expression', '目前僅提供第一單元題目。');
  if (!Object.hasOwn(BLUEPRINTS, mode)) fail('invalid-contract', '未知的回合模式。');
  const allocation = quotas || BLUEPRINTS[mode];
  if (Object.keys(allocation).sort().join('') !== 'ABC' || Object.values(allocation).some(n => !Number.isInteger(n) || n < 0 || n > 10)) fail('invalid-contract', '無效的工作站配額。');
  if (mode !== 'remediation' && ['A', 'B', 'C'].some(s => allocation[s] !== BLUEPRINTS[mode][s])) fail('invalid-contract', '配額不符合模式。');
  if (mode === 'remediation' && Object.values(allocation).some(n => n < 2 || n > 6)) fail('invalid-contract', '補救各站須分配 2 至 6 題。');
  const requiredCount = mode === 'challenge' ? 14 : 10;
  if (count !== requiredCount || Object.values(allocation).reduce((a, b) => a + b, 0) !== count) fail('invalid-contract', '題數不符合模式。');
  const random = seededRandom(seed), seen = new Set(), questions = [];
  for (const station of ['A', 'B', 'C']) for (let index = 0; index < allocation[station]; index++) {
    let added = false;
    for (let retry = 0; retry < 500; retry++) {
      const difficulty = difficultyAt(station, index, mode), raw = ({ A: stationA, B: stationB, C: stationC })[station](random, difficulty, index, mode, focusByStation[station]);
      const expressionAst = parse(raw.expression), sourceValue = evaluateAst(expressionAst);
      const expected = raw.taskType === 'largest-square-factor' ? evaluateAst(parse(raw.expectedExpression)) : sourceValue;
      if (raw.expectedExpression && raw.taskType !== 'largest-square-factor' && !equivalent(sourceValue, evaluateAst(parse(raw.expectedExpression)))) fail('invalid-contract', '生成參數與精確答案不一致。');
      if (station === 'B' && inspectSimplest(expressionAst).satisfied !== raw.isSimplest) fail('invalid-contract', 'B 站最簡形式標記不一致。');
      const question = {
        schemaVersion: 1, id: `u1:${mode}:${seed}:${station}:${index}`, unitId, station,
        taskType: raw.taskType, difficulty, templateId: raw.templateId, templateVersion: 1, generatorVersion: GENERATOR_VERSION, seed,
        instruction: raw.instruction, source: raw.expression, expressionAst,
        ...(raw.presentation ? { presentation: raw.presentation } : {}),
        ...(mode === 'challenge' ? { challengeContractVersion: 1, difficultyPolicy: 'unit-one-small-v1',
          interactionSpec: { schemaVersion: 1, kind: station === 'A' ? raw.taskType === 'largest-square-factor' ? 'square-factor' : 'decomposition-and-answer' : station === 'B' ? 'judgment-and-correction' : 'rationalization-bundle' } } : {}),
        responseSchema: station === 'B' ? 'judgment-and-expression' : 'expression',
        answerSpec: { expectedValue: serialize(expected), requiredForm: 'simplest-monomial', ...(station === 'B' ? { isSimplest: raw.isSimplest } : {}) },
        conceptTags: raw.conceptTags, hintPlan: [1, 2, 3],
        solutionSteps: [...raw.steps, `本題答案：${formatValue(expected)}。`],
        ...(raw.decompositionSpec ? { decompositionSpec: raw.decompositionSpec } : {}),
        ...(raw.stepSpec ? { stepSpec: raw.stepSpec } : {}),
      };
      const key = fingerprint(question); if (seen.has(key)) continue;
      seen.add(key); questions.push(question); added = true; break;
    }
    if (!added) fail('generation-failed', '無法在重試上限內產生不重複題目。');
  }
  if (mode === 'challenge') {
    const shuffledB = random.shuffle(questions.filter(q => q.station === 'B'));
    return [...questions.filter(q => q.station === 'A'), ...shuffledB, ...questions.filter(q => q.station === 'C')];
  }
  return questions;
}
export const questionProvider = Object.freeze({ getQuestions: async request => generateQuestions(request) });
