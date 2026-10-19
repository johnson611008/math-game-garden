// Pure text editing shared by the archived demo and formal practice.
export function editWithSymbol(value, start, end, symbol) {
  start = Math.max(0, Math.min(start, value.length)); end = Math.max(start, Math.min(end, value.length));
  const selection = value.slice(start, end);
  let replacement = symbol, caret;
  if (symbol === 'root') { replacement = `sqrt(${selection})`; caret = start + (selection ? replacement.length : 5); }
  else if (symbol === 'parentheses') { replacement = `(${selection})`; caret = start + (selection ? replacement.length : 1); }
  else if (symbol === 'backspace') {
    if (start === end && start > 0) start -= [...value.slice(0, start)].at(-1).length;
    replacement = ''; caret = start;
  } else if (symbol === 'clear') return { value: '', caret: 0, error: '' };
  const result = value.slice(0, start) + replacement + value.slice(end);
  if (result.length > 256) return { value, caret: end, error: '輸入最多 256 個字元；可以先刪除部分內容。' };
  return { value: result, caret: caret ?? start + replacement.length, error: '' };
}
