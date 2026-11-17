// Four jobs with a beginning, a middle and a payday. Riva calls, you drive, the city answers.
import * as THREE from 'three';
import { buildPerson } from './pedestrians.js';

const SPOTS = {
  pier: { x: 240, z: 266, name: 'Solara Pier' },
  garage: { x: -180, z: 150, name: 'Delmar Garage' },
  tower: { x: 74, z: -74, name: 'Neon Tide Tower' },
  safehouse: { x: -37, z: -111, name: 'Safehouse' },
};

const JOBS = [
  {
    id: 'first-light', title: 'First Light', giver: 'Riva',
    objective: 'Meet Riva at Solara Pier',
    brief: 'Riva has a line on every dock in Port Solara. She wants to meet where the tourists cannot hear.',
    dialogue: 'Riva: You made it. Good. The Vultures are squeezing every dock in this city. I need someone with no name and a fast car.',
    type: 'goto', spot: 'pier', radius: 9, reward: 150,
  },
  {
    id: 'hot-wheels', title: 'Hot Wheels', giver: 'Riva',
    objective: 'Steal a car and deliver it to Delmar Garage',
    brief: 'A collector on Delmar wants a car that is not his. Take one off the avenue and do not scratch it.',
    dialogue: 'Riva: Anything with four wheels and a loud engine. Bring it to Delmar. The buyer pays cash, we split it.',
    type: 'deliver', spot: 'garage', radius: 10, reward: 300,
  },
  {
    id: 'static', title: 'Static', giver: 'Riva',
    objective: 'Clear the Vultures from the radio tower',
    brief: 'The Vultures took the tower and jammed our frequency. Three of them are up there. Make it quiet.',
    dialogue: 'Riva: They are on the tower roof, all red jackets. Three of them. Use the pistol. Come back breathing.',
    type: 'kill', spot: 'tower', radius: 16, reward: 500, targets: 3,
  },
  {
    id: 'tide-turn', title: 'Tide Turn', giver: 'Riva',
    objective: 'Lose the SCPD and reach the safehouse',
    brief: 'The tower job made noise. Get the stars off you, then get home.',
    dialogue: 'Riva: You kicked the hornet nest. Drive. Lose them, then meet me at the safehouse under the overpass.',
    type: 'escape', spot: 'safehouse', radius: 9, reward: 900,
  },
];

export class Missions {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.jobs = JOBS;
    this.index = 0;
    this.active = null;
    this.hostiles = [];
    this.time = 0;
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.22, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.9 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.6;
    this.marker.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    );
    beam.position.y = 13;
    this.marker.add(beam);
    this.ring = ring;
    this.marker.visible = false;
    this.marker.userData.kind = 'marker';
    scene.add(this.marker);
  }

  startNext(game) {
    if (this.index >= this.jobs.length) return null;
    const job = this.jobs[this.index];
    this.active = job;
    this.time = 0;
    const spot = SPOTS[job.spot];
    this.marker.position.set(spot.x, 0.4, spot.z);
    this.marker.visible = true;
    if (job.type === 'kill') {
      for (let i = 0; i < job.targets; i++) {
        const mesh = buildPerson(() => (i + 1) / 3.4, true);
        const a = (i / job.targets) * Math.PI * 2;
        mesh.position.set(spot.x + Math.cos(a) * 6, 0.14, spot.z + Math.sin(a) * 6);
        mesh.userData.kind = 'hostile';
        this.scene.add(mesh);
        this.hostiles.push({ mesh, health: 40, fire: 1.2 + i, dead: false });
      }
    }
    if (job.type === 'escape') {
      game.wanted.add(2, 'tower job');
    }
    game.hud.dialogue(job.giver, job.dialogue, 9);
    game.hud.toast(`NEW JOB: ${job.title}`);
    return job;
  }

  hitHostile(node) {
    const h = this.hostiles.find((x) => x.mesh === node && !x.dead);
    if (!h) return false;
    h.health -= 34;
    this.effects.burst(node.position.clone().setY(1.2), 0xff5544, 8);
    if (h.health <= 0) {
      h.dead = true;
      h.mesh.visible = false;
      this.effects.burst(node.position.clone().setY(1.0), 0xaa2222, 12);
    }
    return true;
  }

  update(dt, game) {
    this.ring.rotation.z += dt * 1.6;
    this.ring.position.y = 1.7 + Math.sin(this.time * 2) * 0.18;
    if (!this.active) return null;
    this.time += dt;
    const job = this.active;
    const spot = SPOTS[job.spot];
    const pos = game.playerCar ? game.playerCar.pos : game.player.pos;
    const dist = Math.hypot(pos.x - spot.x, pos.z - spot.z);

    for (const h of this.hostiles) {
      if (h.dead) continue;
      const dx = pos.x - h.mesh.position.x;
      const dz = pos.z - h.mesh.position.z;
      const d = Math.hypot(dx, dz);
      h.mesh.rotation.y = Math.atan2(dx, dz);
      h.fire -= dt;
      if (d < 42 && h.fire <= 0) {
        h.fire = 1.5 + Math.random();
        const from = new THREE.Vector3(h.mesh.position.x, 1.3, h.mesh.position.z);
        const to = new THREE.Vector3(pos.x, 1.1, pos.z);
        this.effects.tracer(from, to, 0xff8866);
        this.effects.flashAt(from, 14);
        game.player.damage(2.5);
        if (game.player.health <= 0) game.respawn();
      }
    }

    if (job.type === 'goto' && dist < job.radius) return this.complete();
    if (job.type === 'deliver' && game.inCar && dist < job.radius) return this.complete();
    if (job.type === 'kill' && this.hostiles.length && this.hostiles.every((h) => h.dead)) return this.complete();
    if (job.type === 'escape') {
      if (game.wanted.stars < 2 && this.time < 26) game.wanted.add(1, 'heat');
      if (this.time > 16 && dist < job.radius) return this.complete();
    }
    return null;
  }

  complete() {
    const job = this.active;
    this.active = null;
    this.marker.visible = false;
    this.hostiles = [];
    this.index += 1;
    return job;
  }

  resetTo(index) {
    this.index = Math.max(0, Math.min(this.jobs.length, index));
    this.active = null;
    this.marker.visible = false;
    for (const h of this.hostiles) this.scene.remove(h.mesh);
    this.hostiles = [];
  }
}
