// The star meter: crime raises it, quiet streets lower it, and the radio tells you when it changes.
export class Wanted {
  constructor() {
    this.stars = 0;
    this.heat = 0;
    this.announced = 0;
  }

  add(n, reason = '') {
    const before = this.stars;
    this.stars = Math.max(0, Math.min(5, this.stars + n));
    this.heat = 26;
    return { before, after: this.stars, reason };
  }

  update(dt, hidden) {
    if (this.stars === 0) return null;
    this.heat -= dt * (hidden ? 4 : 1);
    if (this.heat <= 0) {
      this.stars -= 1;
      this.heat = this.stars > 0 ? 22 : 0;
      return { dropped: true, stars: this.stars };
    }
    return null;
  }

  clear() { this.stars = 0; this.heat = 0; }
}
