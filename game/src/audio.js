// Synthesised sound: engine, siren, gunshots and the click of a menu, all from WebAudio.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.engineGain = null;
    this.siren = null;
    this.sirenGain = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engine = ctx.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 60;
    this.engine.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engine.start();

    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.siren = ctx.createOscillator();
    this.siren.type = 'square';
    this.siren.frequency.value = 700;
    const sirenFilter = ctx.createBiquadFilter();
    sirenFilter.type = 'bandpass';
    sirenFilter.frequency.value = 800;
    sirenFilter.Q.value = 2;
    this.siren.connect(sirenFilter);
    sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.siren.start();
  }

  setEngine(on, speed = 0) {
    if (!this.ctx) return;
    this.engineGain.gain.setTargetAtTime(on ? 0.1 : 0, this.ctx.currentTime, 0.15);
    this.engine.frequency.setTargetAtTime(48 + Math.abs(speed) * 4.2, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, 0.2);
    if (on) {
      const t = this.ctx.currentTime;
      this.siren.frequency.cancelScheduledValues(t);
      this.siren.frequency.setValueAtTime(620, t);
      this.siren.frequency.linearRampToValueAtTime(920, t + 0.55);
      this.siren.frequency.linearRampToValueAtTime(620, t + 1.1);
      setTimeout(() => { if (this.sirenGain.gain.value > 0.01) this.setSiren(true); }, 1200);
    }
  }

  shot() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = 0.16;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1500;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }

  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 520;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.13);
  }
}
