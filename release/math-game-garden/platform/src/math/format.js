export function formatValue(value) {
  const terms = [...value].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (!terms.length) return '0';
  return terms.map(([r, q], i) => {
    const n = q.n < 0n ? -q.n : q.n;
    const body = r === 1n ? String(n) : `${n === 1n ? '' : n}sqrt(${r})`;
    return `${q.n < 0n ? '-' : i ? '+' : ''}${q.d === 1n ? body : `${body}/${q.d}`}`;
  }).join('');
}
