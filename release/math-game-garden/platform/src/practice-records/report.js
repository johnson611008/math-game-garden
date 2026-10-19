import { practiceSummary } from '../practice-live/session.js';
const names = {
  'square-factor': '平方因數', 'radical-simplification': '根式化簡', 'perfect-square': '完全平方根', sign: '正負號',
  'root-factor': '根號外係數', 'sqrt-distribution': '根號與加減', 'fraction-reduction': '分數約分', rationalization: '分母有理化',
  domain: '實數定義域與非零分母',
  'synchronized-operation': '分子分母同乘', 'rationalizing-multiplier': '有理化乘數', 'simplest-judgment': '最簡形式判斷', 'other-math-error': '運算步驟檢查',
};
export const conceptName = id => names[id] || '運算與最簡形式檢查';
export function learningReport(state) {
  const summary = practiceSummary(state), concepts = new Map();
  const rows = state.attempt.questions.map((question, i) => {
    const record = state.attempt.responses[question.id], first = record?.first;
    const firstSubmission = record?.submissions.find(s => s.result.consumesFirst) || null;
    const wrong = !!first && !first.accepted;
    const diagnostic = wrong ? first.result?.status === 'domain-error' ? [{ conceptId: 'domain' }] : first.diagnosis || [] : [];
    for (const id of new Set(diagnostic.map(d => d.conceptId))) concepts.set(id, (concepts.get(id) || 0) + 1);
    return { index: i, question, first, firstSubmission, wrong, corrected: wrong && !!record?.latest?.accepted,
      equivalentNotSimplest: !!(first?.result?.status === 'equivalent-not-simplest' || first?.result?.correction?.status === 'equivalent-not-simplest'),
      hintCount: record?.hints?.length || 0, solutionCount: record?.solutionViews?.length || 0,
      concepts: [...new Set(diagnostic.map(d => d.conceptId))], record };
  });
  return { ...summary, firstAccuracy: summary.firstCorrect * 10,
    correctedCount: rows.filter(r => r.corrected).length,
    hintQuestions: rows.filter(r => r.hintCount > 0).length,
    stations: ['A', 'B', 'C'].map(station => ({ station, total: rows.filter(r => r.question.station === station).length, firstCorrect: rows.filter(r => r.question.station === station && r.first?.accepted).length, corrected: rows.filter(r => r.question.station === station && r.corrected).length })),
    concepts: [...concepts].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, name: conceptName(id), count })),
    uncertainCount: rows.filter(r => r.wrong && !r.concepts.length).length, rows,
  };
}
