import { liveTemplate, renderLive } from './view.js';
import { practiceSummary } from './session.js';
import { editWithSymbol } from '../ui/math-input.js';
import { mountMathKeyboard } from '../ui/math-keyboard-focus.js';

export function mountLivePractice(root, session, { onRestart = () => {}, onHome = () => {} } = {}) {
  let error = '', lastInput = 'answer-input';
  root.innerHTML = liveTemplate(); session.resume();
  const get = id => root.querySelector(`#${id}`);
  const keyboard = mountMathKeyboard(root, root.querySelectorAll('input[data-field]'), get('symbol-keypad'));
  const render = () => { const state = session.getState(); renderLive(root, state, session.hintText(), practiceSummary(state), error); };
  const state = () => session.getState();
  function activeInput() {
    const preferred = get(lastInput), details = preferred?.closest('details');
    if (preferred && !preferred.closest('[hidden]') && (!details || details.open)) return preferred;
    return get(state().attempt.questions[state().index].station === 'B' ? 'correction-input' : 'answer-input');
  }
  function safely(action) {
    try { action(); } catch (e) { error = `目前無法完成這個操作，請保留本頁再試一次。${e.code === 'resource-limit' ? '本回合事件已達上限。' : ''}`; }
    render();
  }
  function input(event) {
    if (!event.target.dataset?.field) return;
    error = ''; session.update(event.target.dataset.field, event.target.value); render();
  }
  function change(event) {
    if (event.target.name !== 'judgment') return;
    error = ''; session.update('judgment', event.target.value === 'yes'); render();
  }
  function submit(event) {
    if (event.target.id !== 'answer-form') return;
    event.preventDefault(); error = '';
    safely(() => {
      const result = session.submit();
      if (result && !result.consumesFirst) error = `${result.message} 這次不消耗首次作答。`;
    });
    if (error) {
      const s = state(), q = s.attempt.questions[s.index], d = s.drafts[s.index];
      if (q.station === 'B' && d.judgment === null) root.querySelector('input[name="judgment"]').focus();
      else get(q.station === 'B' ? 'correction-input' : 'answer-input').focus();
    }
  }
  function click(event) {
    if (event.defaultPrevented) return;
    const home = event.target.closest('a');
    if (home?.hasAttribute('data-home')) { event.preventDefault(); onHome(); return; }
    const button = event.target.closest('button'); if (!button || !root.contains(button) || button.disabled) return;
    if (button.id === 'restart-button') { onRestart(); return; }
    if (button.dataset.symbol !== undefined) {
      const target = activeInput(), edit = editWithSymbol(target.value, target.selectionStart ?? target.value.length, target.selectionEnd ?? target.value.length, button.dataset.symbol);
      session.update(target.dataset.field, edit.value); error = edit.error; render(); keyboard.restore(target, edit.caret); return;
    }
    error = '';
    safely(() => {
      if (button.id === 'hint-button') session.hint();
      else if (button.id === 'solution-button') session.solution();
      else if (button.id === 'check-multiplier') session.step('multiplier');
      else if (button.id === 'check-synchronized') session.step('synchronized');
      else {
        if (button.dataset.question !== undefined) session.go(Number(button.dataset.question));
        else if (button.id === 'previous-button') session.go(state().index - 1);
        else if (button.id === 'next-button') state().index === 9 ? session.results() : session.go(state().index + 1);
        else if (button.id === 'review-button') session.go(0);
        else return;
        lastInput = 'answer-input'; get('rationalization-steps').open = false;
      }
    });
    if (button.id === 'previous-button' || button.id === 'next-button' || button.id === 'review-button' || button.dataset.question !== undefined) get(state().showResults ? 'completion-title' : 'question-title').focus();
  }
  const handlers = {
    input, change, submit, click,
    focusin: event => { if (event.target.dataset?.field) lastInput = event.target.id; },
    pointerdown: event => { if (event.target.closest('button[data-symbol]')) event.preventDefault(); },
  };
  for (const [name, handler] of Object.entries(handlers)) root.addEventListener(name, handler);
  render();
  return { dispose() { keyboard.dispose(); for (const [name, handler] of Object.entries(handlers)) root.removeEventListener(name, handler); } };
}
