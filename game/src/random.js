// A seeded PRNG so a screenshot scene plays the same way every time.
export function makeRandom(seed = 1) {
  let s = (seed | 0) || 1;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function between(rng, a, b) {
  return a + rng() * (b - a);
}
