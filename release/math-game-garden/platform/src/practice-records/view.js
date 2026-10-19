import { learningReport, conceptName } from './report.js';
import { questionFormula, questionLabel, firstLabel } from '../ui/practice-format.js';
import { formatValue } from '../math/format.js';
import { deserialize } from '../math/radical-value.js';
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const button = (action, label, id = '', domId = '') => `<button type="button" ${domId ? `id="${domId}"` : ''} data-record-action="${action}" data-round="${esc(id)}">${label}</button>`;
export function recordsToolbar() {
  return `<section class="records-tools" aria-label="練習紀錄管理"><p id="save-status" role="status" aria-live="polite"></p><p id="records-message" role="alert"></p><div class="support-actions">${button('history', '最近練習成果', '', 'records-history')}${button('current', '回到目前回合', '', 'records-current')}${button('retry', '重新嘗試保存', '', 'records-retry')}${button('export', '下載紀錄與復原備份', '', 'records-export')}${button('recover', '備份原始資料後啟用新儲存', '', 'records-recover')}</div><p class="records-privacy">只保存在這個瀏覽器，不收集姓名或帳號；最多30回合，超過90天的已完成回合可清理。</p></section>`;
}
export function outcomesMarkup(state) {
  const report = learningReport(state);
  return `<div class="learning-outcomes"><p><strong>首次正確率：${report.firstAccuracy}%</strong>（${report.firstCorrect} / 10）</p><p>已訂正 ${report.correctedCount} 題 · 使用提示 ${report.hintQuestions} 題</p><ul>${report.stations.map(s => `<li>${s.station}站：首次答對 ${s.firstCorrect} / ${s.total}；已訂正 ${s.corrected} 題</li>`).join('')}</ul><p>需要加強的概念：${report.concepts.length ? report.concepts.map(c => `${esc(c.name)}（${c.count}題）`).join('、') : '目前沒有可確認的錯誤概念。'}${report.uncertainCount ? ` 另有${report.uncertainCount}題先看解答或未作答，證據不足。` : ''}</p><p>訂正包含看過解答後再答對；首次紀錄仍保留。概念分類是學習線索，不是能力標籤。</p>${button('review', '查看本回合錯題', state.attempt.id)}</div>`;
}
export function historyMarkup(states, isSaved) {
  const sorted = [...states].sort((a, b) => Date.parse(b.attempt.startedAt) - Date.parse(a.attempt.startedAt));
  return `<section class="records-page"><h1 tabindex="-1" id="records-title">最近保留的練習成果</h1><p>未完成回合不會被當作已完成；繼續練習會使用原題與原首次結果。</p>${button('new', '開始新一回合')}<ol class="history-list">${sorted.map(state => {
    const a = state.attempt, ended = ['completed', 'abandoned'].includes(a.status), r = learningReport(state);
    const date = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.startedAt));
    return `<li><h2>${esc(date)}</h2><p>${a.status === 'completed' ? '已完成' : a.status === 'abandoned' ? '已確認放棄（不是已完成）' : '未完成'} · ${isSaved(state) ? '已保存' : '尚未保存'}</p><p>${a.status === 'completed' ? `首次答對 ${r.firstCorrect}/10，${r.firstAccuracy}%；訂正${r.correctedCount}題` : `已完成${r.resolved}/10題；已有${a.completedCount}題首次紀錄`}</p><div class="support-actions">${ended ? button('review', '查看成果與錯題', a.id) : button('continue', '繼續練習', a.id) + button('abandon', '放棄此回合…', a.id)}</div></li>`;
  }).join('')}</ol>${!sorted.length ? '<p>目前沒有可讀取的回合紀錄。</p>' : ''}</section>`;
}
function responseText(response) {
  if (!response) return '未曾正式提交';
  if (typeof response.isSimplest === 'boolean') return `${response.isSimplest ? '已是最簡' : '需要修正'}${response.correctedAnswer !== undefined ? `；修正：${response.correctedAnswer}` : ''}`;
  return response.answer || '未曾正式提交';
}
export function reviewMarkup(state, all = false) {
  const r = learningReport(state), rows = all ? r.rows : r.rows.filter(row => row.wrong);
  return `<section class="records-page"><h1 tabindex="-1" id="records-title">${all ? '全題回顧' : '本回合錯題回顧'}</h1><p>${state.attempt.status === 'completed' ? `首次答對${r.firstCorrect}/10（${r.firstAccuracy}%），已訂正${r.correctedCount}題。` : '此回合已確認放棄；以下不是已完成成績。'} 訂正不會抹去第一次的學習痕跡。</p><div class="support-actions">${button('history', '回到最近成果')}${button(all ? 'review' : 'review-all', all ? '只看首次未答對題目' : '查看全部十題', state.attempt.id)}${button('new', '開始新一回合')}</div>${!rows.length ? '<p>沒有首次未答對的題目，可以切換查看全部十題。</p>' : ''}${rows.map(row => {
    const q = row.question, result = row.first?.result;
    const mathStatus = row.equivalentNotSimplest ? '數值等值，但尚未最簡。' : result?.equivalent === true ? '答案數值等值，形式已符合要求。' : result?.equivalent === false ? '與正確值不同。' : result?.status === 'domain-error' ? '首次提交不符合實數算式的定義域。' : row.first?.accepted ? '符合題目要求。' : '未取得可判定的首次數學結果。';
    return `<article class="review-card"><h2>第${row.index + 1}題 · ${q.station}站</h2><p>${esc(q.instruction)}</p><div class="question-expression" role="math" aria-label="${esc(questionLabel(q))}">${questionFormula(q)}</div><dl><dt>首次正式提交的答案</dt><dd>${esc(responseText(row.firstSubmission?.response))}</dd><dt>首次結果</dt><dd>${esc(firstLabel(row.record))}${row.first?.kind === 'revealed' ? '；先看完整解答，不列首次答對。' : ''}</dd><dt>等值與形式</dt><dd>${mathStatus}${q.station === 'B' && result ? ` 最簡判斷：${result.judgmentCorrect ? '正確' : '未符合要求'}；修正：${result.correctionCorrect === null ? '不適用' : result.correctionCorrect ? '正確' : '未符合要求'}。` : ''}</dd><dt>概念線索</dt><dd>${row.concepts.length ? row.concepts.map(id => esc(conceptName(id))).join('、') : row.wrong ? '證據不足，建議再練習確認。' : '首次沒有錯誤證據。'}</dd><dt>訂正與支援</dt><dd>${row.corrected ? '已訂正成功；首次錯誤仍保留。' : row.record?.latest?.accepted ? '已答對。' : '尚無答對的提交。'} 使用提示${row.hintCount}次，查看完整解答${row.solutionCount}次。</dd><dt>正確答案</dt><dd>${esc(formatValue(deserialize(q.answerSpec.expectedValue)))}</dd></dl><h3>完整解題步驟</h3><ol>${q.solutionSteps.map(step => `<li>${esc(step)}</li>`).join('')}</ol></article>`;
  }).join('')}</section>`;
}
export function abandonMarkup(state) {
  return `<section class="records-page"><h1 id="records-title" tabindex="-1">確認放棄這個未完成回合？</h1><p>尚未作答的題目會記為跳題，已提交的首次結果仍保留。此回合會標示「已確認放棄」，不會偽裝成已完成，也不影響遊戲資格。</p><div class="support-actions">${button('confirm-abandon', '確認放棄', state.attempt.id)}${button('cancel-abandon', '取消，保留回合', state.attempt.id)}</div></section>`;
}
