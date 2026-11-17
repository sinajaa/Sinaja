// The corner map: roads, blocks, the job marker, the cops and which way you are facing.
import { ROADS } from './roads.js';
import { CITY } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
  }

  toMap(x, z, px, pz, scale) {
    return [this.size / 2 + (x - px) * scale, this.size / 2 + (z - pz) * scale];
  }

  draw(state) {
    const g = this.ctx;
    const S = this.size;
    const scale = 1.35;
    const px = state.playerX;
    const pz = state.playerZ;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#101b2c';
    g.fillRect(0, 0, S, S);
    // water and beach
    const [, wy] = this.toMap(0, CITY.water - 40, px, pz, scale);
    g.fillStyle = '#1d556b';
    g.fillRect(0, wy, S, S - wy);
    g.fillStyle = 'rgba(232,211,163,.35)';
    g.fillRect(0, wy - 34 * scale, S, 28 * scale);
    // blocks
    const blockPx = CITY.block * scale;
    g.fillStyle = '#1b2a3d';
    for (let i = -CITY.blocks; i <= CITY.blocks; i++) {
      for (let j = -CITY.blocks; j <= CITY.blocks; j++) {
        const [mx, mz] = this.toMap(i * CITY.step, j * CITY.step, px, pz, scale);
        if (mx < -blockPx || mx > S + blockPx || mz < -blockPx || mz > S + blockPx) continue;
        g.fillRect(mx - blockPx / 2, mz - blockPx / 2, blockPx, blockPx);
      }
    }
    // roads
    g.strokeStyle = '#51637a';
    g.lineWidth = CITY.roadHalf * 2 * scale;
    for (const r of ROADS) {
      const [vx, vz] = this.toMap(r, 0, px, pz, scale);
      g.beginPath(); g.moveTo(vx, 0); g.lineTo(vx, S); g.stroke();
      const [hx, hz] = this.toMap(0, r, px, pz, scale);
      g.beginPath(); g.moveTo(0, hz); g.lineTo(S, hz); g.stroke();
    }
    g.strokeStyle = 'rgba(242,208,107,.5)';
    g.lineWidth = 1.5;
    for (const r of ROADS) {
      const [vx] = this.toMap(r, 0, px, pz, scale);
      g.beginPath(); g.moveTo(vx, 0); g.lineTo(vx, S); g.stroke();
      const [, hz] = this.toMap(0, r, px, pz, scale);
      g.beginPath(); g.moveTo(0, hz); g.lineTo(S, hz); g.stroke();
    }
    // mission marker
    if (state.marker) {
      const [mx, mz] = this.toMap(state.marker.x, state.marker.z, px, pz, scale);
      g.save();
      g.translate(mx, mz);
      g.rotate(Math.PI / 4);
      g.fillStyle = '#ffcc66';
      g.fillRect(-7, -7, 14, 14);
      g.restore();
      g.strokeStyle = 'rgba(255,204,102,.55)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(mx, mz, 13, 0, Math.PI * 2); g.stroke();
    }
    // police
    for (const p of state.police) {
      const [x, y] = this.toMap(p.x, p.z, px, pz, scale);
      g.fillStyle = '#ff4b4b';
      g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fill();
    }
    // player arrow
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(-state.heading + Math.PI);
    g.fillStyle = '#fff6dc';
    g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.16)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, S - 3, S - 3);
  }
}
