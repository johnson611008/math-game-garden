// Randomness chooses bounded parameters only; it never decides mathematical equivalence.
export function seededRandom(seed) {
  if (typeof seed !== 'string' || !seed || seed.length > 128) throw new TypeError('seed 必須是 1 至 128 字元。');
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return {
    int(min, max) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return min + Math.floor((state / 4294967296) * (max - min + 1)); },
    shuffle(items) { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = this.int(0, i); [out[i], out[j]] = [out[j], out[i]]; } return out; },
  };
}
