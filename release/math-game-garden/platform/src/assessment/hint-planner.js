const hints = {
  sign: ['根號表示非負平方根；根號外的負號要另外保留。', '先決定整個算式的符號，再整理係數。'],
  'root-factor': ['提出平方因數時，根號外是否少了一個係數？', '若 n=s²r，則 sqrt(n)=s sqrt(r)。'],
  'sqrt-distribution': ['根號不能直接分配到加減各項。', '先算根號內的和，再開平方；也可用平方驗證候選值。'],
  'square-factor': ['找找根號內是否藏著平方數。', '將被開方數拆成平方數乘上另一個整數。'],
  'perfect-square': ['這個數是哪個整數的平方？', '完全平方根應整理成整數。'],
  'fraction-reduction': ['分子與分母有沒有公因數？', '分子與分母同除以公因數。'],
  rationalization: ['分母還有根號嗎？', '想想同乘哪個根式能讓分母成為有理數。'],
  'synchronized-operation': ['分數值不變要同時調整哪兩處？', '分子與分母要同乘相同的非零乘數。'],
  'rationalizing-multiplier': ['哪個根式能讓分母根號消失？', '檢查分母乘上所選因子後是否為非零有理數。'],
  'simplest-judgment': ['逐項檢查根號、分母與約分。', '數值等值不代表形式已最簡。'],
};
export function planHint(question, conceptId, level) {
  if (![1, 2, 3].includes(level)) throw new RangeError('提示層級必須為 1、2 或 3。');
  return { questionId: question.id, level, revealsAnswer: level === 3,
    text: level === 3 ? question.solutionSteps.join('\n') : (hints[conceptId] || ['從原式逐步檢查。', '先檢查平方因數，再檢查分母與約分。'])[level - 1] };
}
