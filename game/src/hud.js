// The overlay: vitals, money, stars, clock, objective, minimap and the words people say.
import { Minimap } from './minimap.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.health = document.getElementById('healthfill');
    this.money = document.getElementById('money');
    this.wanted = document.getElementById('wanted');
    this.clock = document.getElementById('clock');
    this.district = document.getElementById('district');
    this.objective = document.getElementById('objtext');
    this.toastEl = document.getElementById('toast');
    this.dialogueEl = document.getElementById('dialogue');
    this.dialogueWho = this.dialogueEl.querySelector('.who');
    this.dialogueText = document.getElementById('dialoguetext');
    this.crosshair = document.getElementById('crosshair');
    this.speedo = document.getElementById('speedo');
    this.speedVal = document.getElementById('speedval');
    this.mission = document.getElementById('mission');
    this.missionTitle = document.getElementById('mtitle');
    this.missionSub = document.getElementById('msub');
    this.missionText = document.getElementById('mtext');
    this.toastTimer = 0;
    this.dialogueTimer = 0;
    this.minimap = new Minimap(document.getElementById('minimap'));
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.innerHTML = '&#9733;';
      this.wanted.appendChild(s);
      this.stars.push(s);
    }
  }

  show() { this.root.classList.add('on'); }
  hide() { this.root.classList.remove('on'); }

  update(state) {
    this.health.style.width = `${Math.max(0, state.health)}%`;
    this.health.style.background = state.health < 30
      ? 'linear-gradient(90deg,#ff8a6a,#e0332f)' : 'linear-gradient(90deg,#5ff08a,#12c46a)';
    this.money.textContent = `$${state.money.toLocaleString('en-US')}`;
    this.stars.forEach((s, i) => s.classList.toggle('lit', i < state.stars));
    this.clock.textContent = state.clock;
    this.district.textContent = state.district;
    this.objective.textContent = state.objective;
    this.crosshair.classList.toggle('on', !state.inCar);
    this.speedo.classList.toggle('on', state.inCar);
    if (state.inCar) this.speedVal.textContent = String(Math.round(Math.abs(state.speed) * 3.6));
    this.minimap.draw(state);
  }

  toast(text, seconds = 2.6) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    this.toastTimer = seconds;
  }

  dialogue(who, text, seconds = 6) {
    this.dialogueWho.textContent = who;
    this.dialogueText.textContent = text;
    this.dialogueEl.classList.add('on');
    this.dialogueTimer = seconds;
  }

  tick(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('on');
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueEl.classList.remove('on');
    }
  }

  showMission(title, sub, text, onContinue) {
    this.missionTitle.textContent = title;
    this.missionSub.textContent = sub;
    this.missionText.textContent = text;
    this.mission.classList.add('on');
    const btn = document.getElementById('mbtn');
    btn.onclick = () => {
      this.mission.classList.remove('on');
      if (onContinue) onContinue();
    };
  }

  hideMission() { this.mission.classList.remove('on'); }
}
