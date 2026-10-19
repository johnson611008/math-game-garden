const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
import { validatePowerPresentation } from '../questions/power-presentation.js';
export function questionLabel(question) {
  validatePowerPresentation(question);
  return question.presentation ? `平方根（${question.presentation.factors.map(f => `${f.base} 的 ${f.exponent} 次方`).join(' 乘以 ')}）` : question.source.replaceAll('sqrt', '平方根');
}
export function questionFormula(question) {
  validatePowerPresentation(question);
  if (!question.presentation) return formula(question.expressionAst);
  return `<span class="radical-display">√<span class="radicand">${question.presentation.factors.map(f => `${f.base}<sup>${f.exponent}</sup>`).join(' × ')}</span></span>`;
}
export function formula(ast) {
  if (ast.type === 'number') return escape(ast.text);
  if (ast.type === 'unary') return `${ast.operator === '-' ? '−' : '+'}${formula(ast.argument)}`;
  if (ast.type === 'sqrt') return `<span class="radical-display">√<span class="radicand">${formula(ast.argument)}</span></span>`;
  if (ast.operator === '/') return `<span class="math-fraction"><span>${formula(ast.left)}</span><span>${formula(ast.right)}</span></span>`;
  return `(${formula(ast.left)} ${escape({ '*': '×', '+': '+', '-': '−' }[ast.operator])} ${formula(ast.right)})`;
}
export function firstLabel(record) {
  if (!record?.first) return '尚未有效提交';
  if (record.first.kind === 'revealed' || record.first.assistedByAnswer) return '先查看解答';
  if (record.first.accepted) return '首次答對';
  if (record.first.result?.status === 'equivalent-not-simplest' || (record.first.result?.judgmentCorrect && record.first.result?.correction?.status === 'equivalent-not-simplest')) return '首次等值未最簡';
  return '首次未答對';
}
