import { fail } from '../math/errors.js';
export function normalizeInput(input) {
  if (typeof input !== 'string') fail('invalid-input', '請輸入算式文字。');
  if (input.length > 256) fail('resource-limit', '輸入不得超過 256 字元。');
  return input.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ').replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
}
export function parse(input) {
  const text = normalizeInput(input), tokens = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    const rest = text.slice(i), number = /^(?:[0-9]+(?:\.[0-9]+)?)/.exec(rest);
    if (number) {
      if (number[0].replace('.', '').length > 12) fail('resource-limit', '數字最多 12 位數。');
      tokens.push({ type: 'number', text: number[0] }); i += number[0].length; continue;
    }
    if (rest.startsWith('sqrt')) { tokens.push({ type: 'sqrt' }); i += 4; continue; }
    if ('√+-*/()'.includes(text[i])) { tokens.push({ type: text[i] }); i++; continue; }
    fail('unsupported-expression', '包含尚未支援的字元或語法。');
  }
  if (!tokens.length) fail('invalid-input', '請先輸入答案。');
  let at = 0, nodes = 0;
  const peek = () => tokens[at]?.type;
  const node = (type, fields = {}) => { if (++nodes > 128) fail('resource-limit', '算式節點過多。'); return { type, ...fields }; };
  function atom(depth) {
    if (depth > 16) fail('resource-limit', '括號或運算巢狀過深。');
    const token = tokens[at++];
    if (!token) fail('invalid-input', '算式尚未完成。');
    if (token.type === 'number') return node('number', { text: token.text });
    if (token.type === '+' || token.type === '-') return node('unary', { operator: token.type, argument: atom(depth + 1) });
    if (token.type === '(') {
      const result = expression(0, depth + 1);
      if (peek() !== ')') fail('invalid-input', '括號未閉合。');
      at++; return result;
    }
    if (token.type === 'sqrt' || token.type === '√') {
      if (token.type === 'sqrt' && peek() !== '(') fail('invalid-input', 'sqrt 必須接括號。');
      if (peek() !== '(' && peek() !== 'number') fail('invalid-input', '根號後請接數字或括號。');
      return node('sqrt', { argument: atom(depth + 1) });
    }
    fail('invalid-input', '運算子或括號位置不正確。');
  }
  function expression(min, depth) {
    let left = atom(depth);
    while (at < tokens.length && peek() !== ')') {
      let op = peek(), implicit = false;
      if (['number', '(', 'sqrt', '√'].includes(op)) { op = '*'; implicit = true; }
      const priority = ({ '+': 1, '-': 1, '*': 2, '/': 2 })[op];
      if (!priority || priority < min) break;
      if (implicit && peek() === 'number') fail('invalid-input', '相鄰數字之間需要運算子。');
      if (!implicit) at++;
      left = node('binary', { operator: op, left, right: expression(priority + 1, depth + 1) });
    }
    return left;
  }
  const ast = expression(0, 0);
  if (at !== tokens.length) fail('invalid-input', '算式有多餘的括號或符號。');
  // Count actual AST depth as well as parser recursion (long left-associated chains).
  function check(n, d) { if (d > 16) fail('resource-limit', '算式結構過深。'); if (n.argument) check(n.argument, d + 1); if (n.left) { check(n.left, d + 1); check(n.right, d + 1); } }
  check(ast, 0); return ast;
}
