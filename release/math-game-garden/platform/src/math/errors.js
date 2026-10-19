export class EngineError extends Error {
  constructor(code, message) { super(message); this.name = 'EngineError'; this.code = code; }
}
export function fail(code, message) { throw new EngineError(code, message); }
export function bounded(n) {
  if (n.toString(2).replace('-', '').length > 4096) fail('resource-limit', '精確整數超過運算上限。');
  return n;
}
