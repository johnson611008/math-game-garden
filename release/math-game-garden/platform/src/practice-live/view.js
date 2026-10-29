import { recordsToolbar, outcomesMarkup } from '../practice-records/view.js';
import { questionFormula, questionLabel, firstLabel } from '../ui/practice-format.js';
export { formula, firstLabel } from '../ui/practice-format.js';
export const stationNames = { A: '平方因數與根式化簡', B: '最簡判斷與修正', C: '單項分母有理化' };
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function liveTemplate() {
  const field = (id, key, label) => `<label for="${id}">${label}</label><input id="${id}" data-field="${key}" type="text" maxlength="256" autocomplete="off" autocapitalize="off" spellcheck="false">`;
  return `<section class="practice-heading"><div><p class="eyebrow">單元 01 · 自主練習</p><h1 id="practice-title" tabindex="-1">根式化簡</h1><p>十題一回合 · 不限時 · 可以反覆練習</p></div><span class="demo-tag">正式練習</span></section>
  <aside class="notice demo-notice"><strong>慢慢想，練懂比趕快更重要。</strong><span>首次作答與訂正分開保存；重新開啟可恢復回合，請留意下方保存狀態。練習沒有通關門檻，也不影響遊戲資格。</span></aside>${recordsToolbar()}
  <section id="round-view" aria-label="十題自主練習"><div class="progress-heading"><span id="question-counter"></span><span id="submission-counter"></span></div><progress id="round-progress" max="10" value="0" aria-label="已完成題數"></progress><ol id="progress-dots" class="progress-dots" aria-label="前往題目"></ol>
  <div class="practice-grid"><section class="question-panel" aria-labelledby="question-title"><div class="question-meta"><span id="station-tag"></span><span>正式題目</span></div><h2 id="question-title" tabindex="-1"></h2><p id="question-instruction"></p><div id="question-expression" class="question-expression" role="math"></div><p class="gentle-note">可以先在紙上寫出步驟，再輸入答案。</p>
  <div class="support-actions"><button type="button" id="hint-button">查看概念提示</button><button type="button" id="solution-button" aria-controls="solution-panel">查看完整解答（會記錄）</button></div>
  <div id="hint-panel" class="support-panel" hidden><h3>想一想</h3><div id="hint-text"></div></div><div id="solution-panel" class="support-panel" hidden><h3>完整解題步驟</h3><ol id="solution-steps"></ol><p id="solution-note"></p></div></section>
  <section class="answer-panel" aria-labelledby="answer-title"><h2 id="answer-title">換你來試試</h2><p id="input-guide">使用下方數學鍵盤輸入最終答案。2sqrt(3) 表示 2√3，sqrt(3)/2 表示 √3 / 2。</p>
  <form id="answer-form" novalidate><div id="judgment-group" hidden><fieldset><legend>這個算式已是最簡形式嗎？</legend><label class="radio-choice"><input type="radio" name="judgment" value="yes"> 已是最簡形式</label><label class="radio-choice"><input type="radio" name="judgment" value="no"> 還需要修正</label></fieldset></div><div id="answer-group"><label id="answer-label" for="answer-input">最簡答案</label><input id="answer-input" data-field="answer" type="text" maxlength="256" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="input-guide input-error"></div><div id="correction-group" hidden>${field('correction-input', 'correction', '修正成最簡形式')}</div>
  <details id="rationalization-steps" hidden><summary>練習並檢查有理化步驟（選填）</summary><p>步驟與最終答案分開記錄；步驟檢查不消耗整題首次作答。</p>${field('multiplier-input', 'numeratorMultiplier', '分子同乘的非零乘數')}${field('denominator-multiplier-input', 'denominatorMultiplier', '分母同乘的非零乘數')}<button type="button" id="check-multiplier">檢查分母有理化乘數</button>${field('transformed-numerator-input', 'transformedNumerator', '同乘後的分子')}${field('transformed-denominator-input', 'transformedDenominator', '同乘後的分母')}<button type="button" id="check-synchronized">檢查分子分母同步操作</button><p id="step-feedback" role="status" aria-live="polite"></p></details>
  <div id="symbol-keypad" class="symbol-keypad" role="group" aria-label="數學符號鍵盤">${[['root', '√ 根號'], ['/', '/ 分數'], ['*', '× 乘號'], ['-', '− 負號'], ['parentheses', '( )'], ['backspace', '退格'], ...'1234567890'.split('').map(n => [n, n]), ['+', '+ 加號'], ['clear', '清除']].map(([symbol, label]) => `<button type="button" data-symbol="${symbol}" aria-label="${label}">${label}</button>`).join('')}</div><p id="input-preview" class="input-preview"></p><p id="input-error" class="input-error" role="alert"></p><button type="submit" id="submit-button" class="primary-button">確認答案</button></form>
  <section id="answer-feedback" class="answer-feedback" role="status" aria-live="polite" aria-atomic="true"></section><p id="first-result" class="first-result"></p><p id="b-diagnostics"></p></section></div>
  <nav class="question-navigation" aria-label="題目導覽"><button type="button" id="previous-button">← 上一題</button><p>答對或明確查看完整解答，計為完成一題。</p><button type="button" id="next-button" class="primary-button">下一題 →</button></nav></section>
  <section id="completion-view" class="completion-view" aria-labelledby="completion-title" hidden><h2 id="completion-title" tabindex="-1">這回合的學習紀錄</h2><p>這是實際作答結果，沒有通關門檻，不會影響遊戲資格。</p><dl id="result-summary" class="result-summary"></dl><div id="detailed-outcomes"></div><div class="result-table-wrap"><table><caption>十題紀錄</caption><thead><tr><th scope="col">題目</th><th scope="col">首次結果</th><th scope="col">目前狀態</th><th scope="col">提示／查看解答</th></tr></thead><tbody id="result-rows"></tbody></table></div><div class="completion-actions"><button type="button" id="review-button">回顧這回合</button><button type="button" id="restart-button" class="primary-button">再練十題</button><a href="../" data-home>返回首頁</a></div></section>`;
}
export function displayStatus(result) {
  return result?.judgmentCorrect && result.correction?.status === 'equivalent-not-simplest' ? 'equivalent-not-simplest' : result?.status || 'unsubmitted';
}
export function renderLive(root, state, hints, summary, error = '') {
  const get = id => root.querySelector(`#${id}`), q = state.attempt.questions[state.index], d = state.drafts[state.index], r = state.attempt.responses[q.id];
  const result = r?.submissions.at(-1)?.result, latestCorrect = !!r?.latest?.accepted, viewed = !!r?.solutionViews?.length;
  const locked = state.attempt.status !== 'in-progress';
  get('round-view').hidden = state.showResults; get('completion-view').hidden = !state.showResults;
  get('question-counter').textContent = `第 ${state.index + 1} / 10 題`;
  const answered = Object.values(state.attempt.responses).filter(record => record.submissions.some(s => s.result.consumesFirst)).length;
  get('submission-counter').textContent = `已完成 ${state.resolvedCount} / 10 · 已有效作答 ${answered} 題`;
  get('round-progress').value = state.resolvedCount;
  get('progress-dots').innerHTML = state.attempt.questions.map((item, i) => {
    const record = state.attempt.responses[item.id], done = record?.latest?.accepted || record?.solutionViews?.length;
    return `<li class="${i === state.index ? 'current' : ''} ${done ? 'submitted' : ''}"><button type="button" data-question="${i}" ${i === state.index ? 'aria-current="step"' : ''} aria-label="第 ${i + 1} 題，${done ? '已完成' : '未完成'}">${i + 1}</button></li>`;
  }).join('');
  get('station-tag').textContent = `${q.station} · ${stationNames[q.station]}`; get('question-title').textContent = stationNames[q.station];
  get('question-instruction').textContent = q.instruction; get('question-expression').innerHTML = questionFormula(q);
  get('question-expression').setAttribute('aria-label', questionLabel(q));
  get('answer-label').textContent = '最簡答案';
  if(q.station==='A')get('question-instruction').textContent='請將下列根式化為最簡根式。';
  get('judgment-group').hidden = q.station !== 'B'; get('answer-group').hidden = q.station === 'B'; get('correction-group').hidden = q.station !== 'B' || d.judgment !== false;
  get('rationalization-steps').hidden = q.station !== 'C';
  for (const [id, field] of [['answer-input', 'answer'], ['correction-input', 'correction'], ['multiplier-input', 'numeratorMultiplier'], ['denominator-multiplier-input', 'denominatorMultiplier'], ['transformed-numerator-input', 'transformedNumerator'], ['transformed-denominator-input', 'transformedDenominator']]) {
    if (get(id).value !== d[field]) get(id).value = d[field]; get(id).disabled = locked;
  }
  for (const radio of root.querySelectorAll('input[name="judgment"]')) { radio.checked = d.judgment === (radio.value === 'yes'); radio.disabled = locked; }
  get('symbol-keypad').hidden = locked || (q.station === 'B' && d.judgment !== false);
  get('input-preview').textContent = `你的輸入：${q.station === 'B' ? d.judgment === true ? '已是最簡形式' : d.correction : d.answer}`;
  get('input-error').textContent = error;
  const status = d.dirty ? 'unsubmitted' : displayStatus(result), feedback = get('answer-feedback');
  feedback.dataset.state = status;
  const label = { correct: '答對了！', incorrect: '再想一想，你可以做到。', 'equivalent-not-simplest': '數值等值，但尚未最簡。', 'domain-error': '先檢查算式能不能在實數範圍計算。', 'invalid-input': '還差一點，先完成輸入格式。', 'unsupported-expression': '這個寫法目前尚未支援。', 'resource-limit': '這個輸入超過目前處理範圍。', unsubmitted: d.dirty ? '已修改，尚未重新提交。' : '準備好就確認答案吧。' }[status];
  const text = d.dirty || !result ? '草稿不會改動已保存的首次結果。' : result.accepted ? '做得好！完整步驟已顯示，可以和你的方法對照。' : result.consumesFirst ? '先看看概念提示，再試著整理一次；也可以選擇進一步提示。' : `${result.message} 這次不消耗首次作答。`;
  const markup = `<strong>${escape(label)}</strong><p>${escape(text)}</p>`; if (feedback.innerHTML !== markup) feedback.innerHTML = markup;
  get('first-result').textContent = `首次紀錄：${firstLabel(r)}${r?.first ? '（訂正不覆寫）' : ''}`;
  get('b-diagnostics').textContent = q.station === 'B' && result?.consumesFirst ? `最簡判斷：${result.judgmentCorrect === null ? '尚未完成' : result.judgmentCorrect ? '正確' : '再檢查'}；修正答案：${result.correctionCorrect === null ? '不適用' : result.correctionCorrect ? '正確' : '尚未符合要求'}` : '';
  get('hint-panel').hidden = !hints.length; get('hint-text').innerHTML = hints.map(h => `<p>${escape(h.text)}</p>`).join('');
  get('hint-button').disabled = hints.length >= 2; get('hint-button').textContent = hints.length >= 2 ? '兩層提示已顯示' : hints.length ? '查看進一步提示' : '查看概念提示';
  const showSolution = latestCorrect || viewed;
  get('solution-panel').hidden = !showSolution;
  // Do not put answers in the hidden DOM before the student's successful completion or explicit reveal.
  get('solution-steps').innerHTML = showSolution ? q.solutionSteps.map(step => `<li>${escape(step)}</li>`).join('') : '';
  get('solution-note').textContent = viewed ? '已記錄查看完整解答；不會因此取得首次答對。' : '這是答對後的完整步驟。';
  get('solution-button').disabled = showSolution; get('solution-button').textContent = showSolution ? '完整步驟已顯示' : '查看完整解答（會記錄）';
  if(q.taskType==='largest-square-factor'){get('solution-button').hidden=true;get('solution-panel').hidden=true;get('solution-steps').replaceChildren();}
  else get('solution-button').hidden=false;
  get('submit-button').disabled = locked; get('submit-button').textContent = locked ? '本回合已完成，可回顧紀錄' : r?.first ? '提交訂正答案' : '確認答案';
  get('check-multiplier').disabled = locked; get('check-synchronized').disabled = locked;
  const steps = r?.steps || [], lastStep = steps.at(-1);
  get('step-feedback').textContent = lastStep ? `${lastStep.step === 'multiplier' ? '有理化乘數' : '同步操作'}：${lastStep.result.accepted ? '正確' : lastStep.result.message || '還需要調整。請檢查同乘因子與兩邊乘積。'}${typeof lastStep.result.synchronized === 'boolean' ? ` 同乘一致：${lastStep.result.synchronized ? '是' : '否'}；分子乘積：${lastStep.result.numeratorCorrect ? '正確' : '再檢查'}；分母乘積：${lastStep.result.denominatorCorrect ? '正確' : '再檢查'}。` : ''}` : '';
  get('previous-button').disabled = state.index === 0;
  get('next-button').disabled = state.index === 9 && state.resolvedCount !== 10;
  get('next-button').textContent = state.index === 9 ? '查看回合結果' : '下一題 →';
  get('result-summary').innerHTML = [['首次答對（未先看完整解答）', `${summary.firstCorrect} / 10`], ['最近有效提交答對', `${summary.currentlyCorrect} / 10`], ['查看完整解答', `${summary.answersViewed} 題`], ['提示使用（含答錯後概念提示）', `${summary.hintActions} 次`]].map(([title, value]) => `<div><dt>${title}</dt><dd>${value}</dd></div>`).join('');
  get('detailed-outcomes').innerHTML = state.showResults ? outcomesMarkup(state) : '';
  get('result-rows').innerHTML = state.attempt.questions.map((item, i) => {
    const record = state.attempt.responses[item.id];
    return `<tr><th scope="row">${i + 1} · ${item.station}</th><td>${firstLabel(record)}</td><td>${record?.latest?.accepted ? record.solutionViews?.length ? '看過解答後答對' : '已答對' : record?.solutionViews?.length ? '已查看解答' : '待練習'}</td><td>${record?.hints?.length || 0} 次提示／${record?.solutionViews?.length || 0} 次查看</td></tr>`;
  }).join('');
}
